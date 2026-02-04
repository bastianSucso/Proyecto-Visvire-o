import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ProductoEntity } from './entities/producto.entity';
import { ProductoTipoEntity, ProductoTipoEnum } from './entities/producto-tipo.entity';
import { InsumoGrupoEntity } from './entities/insumo-grupo.entity';
import { InsumoGrupoItemEntity } from './entities/insumo-grupo-item.entity';
import { CreateInsumoGrupoDto } from './dto/create-insumo-grupo.dto';
import { UpdateInsumoGrupoDto } from './dto/update-insumo-grupo.dto';
import { CreateInsumoGrupoItemDto } from './dto/create-insumo-grupo-item.dto';
import { UpdateInsumoGrupoItemDto } from './dto/update-insumo-grupo-item.dto';
import { RecetasService } from './recetas.service';

@Injectable()
export class InsumoGruposService {
  constructor(
    @InjectRepository(InsumoGrupoEntity)
    private readonly grupoRepo: Repository<InsumoGrupoEntity>,
    @InjectRepository(InsumoGrupoItemEntity)
    private readonly itemRepo: Repository<InsumoGrupoItemEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(ProductoTipoEntity)
    private readonly tipoRepo: Repository<ProductoTipoEntity>,
    private readonly recetasService: RecetasService,
  ) {}

  private async getGrupoOrThrow(id: string) {
    const grupo = await this.grupoRepo.findOne({
      where: { id },
      relations: { items: { producto: true } },
    });
    if (!grupo) throw new NotFoundException('Grupo no encontrado');
    return grupo;
  }

  private resolveUnidadBase(items: InsumoGrupoItemEntity[]) {
    const first = items.find((i) => i.isActive && i.producto);
    return first?.producto?.unidadBase ?? null;
  }

  private async assertProductoInsumo(productoId: string) {
    const exists = await this.tipoRepo.findOne({
      where: { producto: { id: productoId } as any, tipo: ProductoTipoEnum.INSUMO } as any,
    });
    if (!exists) {
      throw new ConflictException('Producto debe tener tipo INSUMO');
    }
  }

  async list(includeInactive = true) {
    const grupos = await this.grupoRepo.find({
      relations: { items: { producto: true } },
      order: { createdAt: 'ASC' },
    });

    const filtered = includeInactive ? grupos : grupos.filter((g) => g.isActive);

    return filtered.map((g) => ({
      id: g.id,
      name: g.name,
      consumoStrategy: g.consumoStrategy,
      isActive: g.isActive,
      unidadBase: this.resolveUnidadBase(g.items ?? []),
      items: (g.items ?? []).map((it) => ({
        id: it.id,
        priority: it.priority ?? null,
        isActive: it.isActive,
        producto: it.producto
          ? {
              id: it.producto.id,
              name: it.producto.name,
              internalCode: it.producto.internalCode,
              unidadBase: it.producto.unidadBase ?? null,
              precioCosto: it.producto.precioCosto,
              isActive: it.producto.isActive,
            }
          : null,
      })),
    }));
  }

  async create(dto: CreateInsumoGrupoDto) {
    const name = dto.name.trim();
    const dup = await this.grupoRepo.findOne({ where: { name } });
    if (dup) throw new ConflictException('Ya existe un grupo con ese nombre');

    const entity = this.grupoRepo.create({
      name,
      consumoStrategy: dto.consumoStrategy,
      isActive: true,
    });

    return this.grupoRepo.save(entity);
  }

  async update(id: string, dto: UpdateInsumoGrupoDto) {
    const grupo = await this.grupoRepo.findOne({ where: { id } });
    if (!grupo) throw new NotFoundException('Grupo no encontrado');

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const dup = await this.grupoRepo.findOne({ where: { name, id: Not(id) } });
      if (dup) throw new ConflictException('Ya existe un grupo con ese nombre');
      grupo.name = name;
    }

    if (dto.consumoStrategy !== undefined) grupo.consumoStrategy = dto.consumoStrategy;
    if (dto.isActive !== undefined) grupo.isActive = dto.isActive;

    const saved = await this.grupoRepo.save(grupo);
    await this.recetasService.recalculateCostosByGrupo(id);
    return saved;
  }

  async addItem(grupoId: string, dto: CreateInsumoGrupoItemDto) {
    const grupo = await this.getGrupoOrThrow(grupoId);
    await this.assertProductoInsumo(dto.productoId);

    const producto = await this.productoRepo.findOne({ where: { id: dto.productoId } });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    const existing = await this.itemRepo.findOne({
      where: { grupo: { id: grupoId } as any, producto: { id: dto.productoId } as any },
    });
    if (existing) throw new ConflictException('Producto ya está en el grupo');

    const activeItems = (grupo.items ?? []).filter((i) => i.isActive && i.producto);
    if (activeItems.length > 0) {
      const unidadBaseGrupo = this.resolveUnidadBase(activeItems);
      if (unidadBaseGrupo !== (producto.unidadBase ?? null)) {
        throw new BadRequestException('Unidad base del producto no coincide con el grupo');
      }
    }

    if (grupo.consumoStrategy === 'PRIORITY' && dto.priority !== undefined) {
      const dupPriority = activeItems.find((it) => it.priority === dto.priority);
      if (dupPriority) {
        throw new BadRequestException('La prioridad ya está asignada a otro producto');
      }
    }

    const entity = this.itemRepo.create({
      grupo: { id: grupoId } as any,
      producto: { id: producto.id } as any,
      priority: dto.priority ?? null,
      isActive: true,
    });

    const saved = await this.itemRepo.save(entity);
    await this.recetasService.recalculateCostosByGrupo(grupoId);
    return saved;
  }

  async updateItem(itemId: string, dto: UpdateInsumoGrupoItemDto) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: { grupo: { items: true } },
    });
    if (!item) throw new NotFoundException('Item no encontrado');

    if (dto.priority !== undefined) item.priority = dto.priority === null ? null : dto.priority;
    if (dto.isActive !== undefined) item.isActive = dto.isActive;

    if (item.grupo?.consumoStrategy === 'PRIORITY' && item.priority !== null) {
      const activeItems = (item.grupo.items ?? []).filter((it) => it.isActive);
      const dupPriority = activeItems.find((it) => it.id !== item.id && it.priority === item.priority);
      if (dupPriority) {
        throw new BadRequestException('La prioridad ya está asignada a otro producto');
      }
    }

    const saved = await this.itemRepo.save(item);
    if (item.grupo?.id) {
      await this.recetasService.recalculateCostosByGrupo(item.grupo.id);
    }
    return saved;
  }

  async removeItem(itemId: string) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: { grupo: true },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    await this.itemRepo.remove(item);
    if (item.grupo?.id) {
      await this.recetasService.recalculateCostosByGrupo(item.grupo.id);
    }
    return { ok: true };
  }
}
