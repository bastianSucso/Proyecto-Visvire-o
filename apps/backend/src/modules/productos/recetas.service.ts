import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecetaEntity } from './entities/receta.entity';
import { ProductoEntity, ProductoTipoEnum } from './entities/producto.entity';
import { InsumoGrupoEntity, InsumoGrupoStrategy } from './entities/insumo-grupo.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from './entities/producto-stock.entity';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { UpdateRecetaDto } from './dto/update-receta.dto';

@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(RecetaEntity)
    private readonly recetaRepo: Repository<RecetaEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(InsumoGrupoEntity)
    private readonly grupoRepo: Repository<InsumoGrupoEntity>,
    @InjectRepository(UbicacionEntity)
    private readonly ubicacionRepo: Repository<UbicacionEntity>,
    @InjectRepository(ProductoStockEntity)
    private readonly stockRepo: Repository<ProductoStockEntity>,
  ) {}

  private async assertTipo(productoId: string, tipo: ProductoTipoEnum) {
    const producto = await this.productoRepo.findOne({ where: { id: productoId } });
    if (!producto || producto.tipo !== tipo) {
      throw new ConflictException(`Producto no tiene tipo ${tipo}`);
    }
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

  private async computeCostoComida(comidaId: string) {
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

    return { comida, items, total };
  }

  async recalculateCostoComida(comidaId: string) {
    if (!comidaId) throw new BadRequestException('comidaId es requerido');
    await this.assertTipo(comidaId, ProductoTipoEnum.COMIDA);

    const { total } = await this.computeCostoComida(comidaId);
    const comida = await this.productoRepo.findOne({ where: { id: comidaId } });
    if (!comida) throw new NotFoundException('Comida no encontrada');
    comida.precioCosto = total > 0 ? total.toFixed(2) : '0.00';
    await this.productoRepo.save(comida);

    return { comidaId, totalCosto: total.toFixed(2) };
  }

  async recalculateCostosByGrupo(grupoId: string) {
    if (!grupoId) throw new BadRequestException('grupoId es requerido');

    const rows = await this.recetaRepo
      .createQueryBuilder('r')
      .innerJoin('r.grupo', 'g')
      .innerJoin('r.comida', 'comida')
      .where('g.id = :grupoId', { grupoId })
      .select('comida.id', 'comidaId')
      .distinct(true)
      .getRawMany<{ comidaId: string }>();

    const ids = rows.map((r) => r.comidaId).filter(Boolean);
    await Promise.all(ids.map((id) => this.recalculateCostoComida(id)));

    return { updated: ids.length };
  }

  async recalculateCostosByInsumo(productoId: string) {
    if (!productoId) throw new BadRequestException('productoId es requerido');

    const rows = await this.recetaRepo
      .createQueryBuilder('r')
      .innerJoin('r.grupo', 'g')
      .innerJoin('g.items', 'gi')
      .innerJoin('gi.producto', 'p')
      .innerJoin('r.comida', 'comida')
      .where('p.id = :productoId', { productoId })
      .select('comida.id', 'comidaId')
      .distinct(true)
      .getRawMany<{ comidaId: string }>();

    const ids = rows.map((r) => r.comidaId).filter(Boolean);
    await Promise.all(ids.map((id) => this.recalculateCostoComida(id)));

    return { updated: ids.length };
  }

  async recalculateCostosAllComidas() {
    const rows = await this.productoRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where('p.tipo = :tipo', { tipo: ProductoTipoEnum.COMIDA })
      .getRawMany<{ id: string }>();

    const ids = rows.map((r) => r.id).filter(Boolean);
    await Promise.all(ids.map((id) => this.recalculateCostoComida(id)));

    return { updated: ids.length };
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

    const saved = await this.recetaRepo.save(entity);
    await this.recalculateCostoComida(dto.comidaId);
    return saved;
  }

  async update(id: number, dto: UpdateRecetaDto) {
    const receta = await this.recetaRepo.findOne({
      where: { id },
      relations: { comida: true },
    });
    if (!receta) throw new NotFoundException('Receta no encontrada');

    if (dto.cantidadBase !== undefined) {
      receta.cantidadBase = dto.cantidadBase.toFixed(3);
    }

    const saved = await this.recetaRepo.save(receta);
    if (receta.comida?.id) {
      await this.recalculateCostoComida(receta.comida.id);
    }
    return saved;
  }

  async remove(id: number) {
    const receta = await this.recetaRepo.findOne({
      where: { id },
      relations: { comida: true },
    });
    if (!receta) throw new NotFoundException('Receta no encontrada');
    await this.recetaRepo.remove(receta);
    if (receta.comida?.id) {
      await this.recalculateCostoComida(receta.comida.id);
    }
    return { ok: true };
  }

  async costos(comidaId: string) {
    if (!comidaId) throw new BadRequestException('comidaId es requerido');
    await this.assertTipo(comidaId, ProductoTipoEnum.COMIDA);

    const { comida, items, total } = await this.computeCostoComida(comidaId);
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

  async posiblesMasivo() {
    const sala = await this.ubicacionRepo.findOne({
      where: { tipo: 'SALA_VENTA', activa: true },
      order: { createdAt: 'ASC' },
    });
    if (!sala) throw new BadRequestException('No hay sala de ventas activa.');

    const comidas = await this.productoRepo
      .createQueryBuilder('p')
      .select(['p.id as id', 'p.name as name', 'p.unidadBase as unidadBase'])
      .where('p.tipo = :tipo', { tipo: ProductoTipoEnum.COMIDA })
      .orderBy('p.createdAt', 'DESC')
      .getRawMany<{ id: string; name: string; unidadBase: string | null }>();

    const stockRows = await this.stockRepo.find({
      where: { ubicacion: { id: sala.id } as any },
      relations: { producto: true },
    });

    const stockMap = new Map<string, number>();
    for (const row of stockRows) {
      const id = row.producto?.id;
      if (!id) continue;
      stockMap.set(id, Number(row.cantidad ?? 0));
    }

    const results = [] as { comidaId: string; nombre: string; unidadBase: string | null; posibles: number }[];

    for (const comida of comidas) {
      const recetas = await this.recetaRepo.find({
        where: { comida: { id: comida.id } as any },
        relations: { grupo: { items: { producto: true } } },
        order: { id: 'ASC' },
      });

      if (!recetas || recetas.length === 0) {
        results.push({
          comidaId: comida.id,
          nombre: comida.name,
          unidadBase: comida.unidadBase ?? null,
          posibles: 0,
        });
        continue;
      }

      const insumoPorcion = new Map<string, { producto: ProductoEntity; cantidad: number }>();
      let invalido = false;

      for (const r of recetas) {
        const insumo = this.resolveGrupoProductoCosto(r.grupo ?? null);
        if (!insumo || !r.grupo?.isActive) {
          invalido = true;
          break;
        }

        const cantidadBase = Number(r.cantidadBase ?? 0);
        if (!Number.isFinite(cantidadBase) || cantidadBase <= 0) {
          invalido = true;
          break;
        }

        const prev = insumoPorcion.get(insumo.id);
        if (prev) {
          prev.cantidad += cantidadBase;
        } else {
          insumoPorcion.set(insumo.id, { producto: insumo, cantidad: cantidadBase });
        }
      }

      if (invalido || insumoPorcion.size === 0) {
        results.push({
          comidaId: comida.id,
          nombre: comida.name,
          unidadBase: comida.unidadBase ?? null,
          posibles: 0,
        });
        continue;
      }

      let posibles = Number.POSITIVE_INFINITY;
      for (const [insumoId, data] of insumoPorcion) {
        const stock = stockMap.get(insumoId) ?? 0;
        const porcion = data.cantidad;
        const posibleInsumo = porcion > 0 ? Math.floor(stock / porcion) : 0;
        posibles = Math.min(posibles, posibleInsumo);
      }

      results.push({
        comidaId: comida.id,
        nombre: comida.name,
        unidadBase: comida.unidadBase ?? null,
        posibles: Number.isFinite(posibles) ? posibles : 0,
      });
    }

    return results;
  }
}
