import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecetaEntity } from './entities/receta.entity';
import { ProductoEntity } from './entities/producto.entity';
import { ProductoTipoEntity, ProductoTipoEnum } from './entities/producto-tipo.entity';
import { InsumoGrupoEntity, InsumoGrupoStrategy } from './entities/insumo-grupo.entity';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { UpdateRecetaDto } from './dto/update-receta.dto';

@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(RecetaEntity)
    private readonly recetaRepo: Repository<RecetaEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(ProductoTipoEntity)
    private readonly tipoRepo: Repository<ProductoTipoEntity>,
    @InjectRepository(InsumoGrupoEntity)
    private readonly grupoRepo: Repository<InsumoGrupoEntity>,
  ) {}

  private async assertTipo(productoId: string, tipo: ProductoTipoEnum) {
    const exists = await this.tipoRepo.findOne({
      where: { producto: { id: productoId } as any, tipo } as any,
    });
    if (!exists) throw new ConflictException(`Producto no tiene tipo ${tipo}`);
  }

  private resolveGrupoUnidadBase(grupo: InsumoGrupoEntity | null) {
    const items = (grupo?.items ?? []).filter((it) => it.isActive && it.producto);
    const first = items[0];
    return first?.producto?.unidadBase ?? null;
  }

  private resolveGrupoProductoCosto(grupo: InsumoGrupoEntity | null) {
    const items = (grupo?.items ?? []).filter((it) => it.isActive && it.producto);
    if (items.length === 0) return null;

    if (grupo?.consumoStrategy === InsumoGrupoStrategy.PRIORITY) {
      const sorted = [...items].sort((a, b) => {
        const pa = a.priority ?? Number.MAX_SAFE_INTEGER;
        const pb = b.priority ?? Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
      return sorted[0]?.producto ?? null;
    }

    const lowest = items.reduce((min, current) => {
      const minCosto = Number(min.producto?.precioCosto ?? 0);
      const curCosto = Number(current.producto?.precioCosto ?? 0);
      return curCosto < minCosto ? current : min;
    });
    return lowest?.producto ?? null;
  }

  async list(comidaId: string) {
    if (!comidaId) throw new BadRequestException('comidaId es requerido');

    await this.assertTipo(comidaId, ProductoTipoEnum.COMIDA);

    const rows = await this.recetaRepo.find({
      where: { comida: { id: comidaId } as any },
      relations: { grupo: { items: { producto: true } }, comida: true },
      order: { id: 'ASC' },
    });

    return rows.map((r) => ({
      id: r.id,
      cantidadBase: r.cantidadBase,
      comida: r.comida
        ? {
            id: r.comida.id,
            name: r.comida.name,
            unidadBase: r.comida.unidadBase ?? null,
            rendimiento: r.comida.rendimiento ?? null,
          }
        : null,
      grupo: r.grupo
        ? {
            id: r.grupo.id,
            name: r.grupo.name,
            consumoStrategy: r.grupo.consumoStrategy,
            unidadBase: this.resolveGrupoUnidadBase(r.grupo),
          }
        : null,
    }));
  }

  async create(dto: CreateRecetaDto) {
    await this.assertTipo(dto.comidaId, ProductoTipoEnum.COMIDA);

    const comida = await this.productoRepo.findOne({ where: { id: dto.comidaId } });
    if (!comida) throw new NotFoundException('Comida no encontrada');

    const grupo = await this.grupoRepo.findOne({
      where: { id: dto.grupoId },
      relations: { items: { producto: true } },
    });
    if (!grupo) throw new NotFoundException('Grupo de insumo no encontrado');
    if (!grupo.isActive) throw new BadRequestException('Grupo de insumo inactivo');
    const hasItems = (grupo.items ?? []).some((it) => it.isActive && it.producto);
    if (!hasItems) throw new BadRequestException('El grupo no tiene insumos activos');

    const dup = await this.recetaRepo.findOne({
      where: { comida: { id: dto.comidaId } as any, grupo: { id: dto.grupoId } as any },
    });
    if (dup) throw new ConflictException('El grupo de insumos ya está en la receta');

    const entity = this.recetaRepo.create({
      comida,
      grupo,
      cantidadBase: dto.cantidadBase.toFixed(3),
    });

    return this.recetaRepo.save(entity);
  }

  async update(id: number, dto: UpdateRecetaDto) {
    const receta = await this.recetaRepo.findOne({ where: { id } });
    if (!receta) throw new NotFoundException('Receta no encontrada');

    if (dto.cantidadBase !== undefined) {
      receta.cantidadBase = dto.cantidadBase.toFixed(3);
    }

    return this.recetaRepo.save(receta);
  }

  async remove(id: number) {
    const receta = await this.recetaRepo.findOne({ where: { id } });
    if (!receta) throw new NotFoundException('Receta no encontrada');
    await this.recetaRepo.remove(receta);
    return { ok: true };
  }

  async costos(comidaId: string) {
    if (!comidaId) throw new BadRequestException('comidaId es requerido');
    await this.assertTipo(comidaId, ProductoTipoEnum.COMIDA);

    const comida = await this.productoRepo.findOne({ where: { id: comidaId } });
    if (!comida) throw new NotFoundException('Comida no encontrada');

    const rows = await this.recetaRepo.find({
      where: { comida: { id: comidaId } as any },
      relations: { grupo: { items: { producto: true } } },
      order: { id: 'ASC' },
    });

    const items = rows.map((r) => {
      const insumo = this.resolveGrupoProductoCosto(r.grupo ?? null);
      const costoUnitario = Number(insumo?.precioCosto ?? 0);
      const cantidad = Number(r.cantidadBase ?? 0);
      const subtotal = costoUnitario * cantidad;

      return {
        id: r.id,
        grupo: r.grupo
          ? {
              id: r.grupo.id,
              name: r.grupo.name,
              consumoStrategy: r.grupo.consumoStrategy,
              unidadBase: this.resolveGrupoUnidadBase(r.grupo),
            }
          : null,
        insumo: insumo
          ? {
              id: insumo.id,
              name: insumo.name,
              unidadBase: insumo.unidadBase ?? null,
              precioCosto: insumo.precioCosto,
            }
          : null,
        cantidadBase: r.cantidadBase,
        costoUnitario: costoUnitario.toFixed(2),
        subtotal: subtotal.toFixed(2),
      };
    });

    const total = items.reduce((sum, it) => sum + Number(it.subtotal ?? 0), 0);
    const rendimiento = Number(comida.rendimiento ?? 0);
    const costoPorcion = rendimiento > 0 ? total / rendimiento : null;

    return {
      comida: {
        id: comida.id,
        name: comida.name,
        unidadBase: comida.unidadBase ?? null,
        rendimiento: comida.rendimiento ?? null,
      },
      totalCosto: total.toFixed(2),
      rendimiento: comida.rendimiento ?? null,
      costoPorcion: costoPorcion !== null ? costoPorcion.toFixed(2) : null,
      items,
    };
  }
}
