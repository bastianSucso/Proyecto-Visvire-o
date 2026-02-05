import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';

import { SesionCajaEntity } from '../historial/entities/sesion-caja.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { ProductoTipoEntity, ProductoTipoEnum } from '../productos/entities/producto-tipo.entity';
import { RecetaEntity } from '../productos/entities/receta.entity';
import { InsumoGrupoEntity, InsumoGrupoStrategy } from '../productos/entities/insumo-grupo.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { AlteraEntity } from '../inventario/entities/altera.entity';

import { VentaEntity, VentaEstado } from './entities/venta.entity';
import { VentaItemEntity } from './entities/venta-item.entity';
import { AddItemVentaDto } from './dto/add-item-venta.dto';
import { UpdateItemVentaDto } from './dto/update-item-venta.dto';
import { ConfirmarVentaDto } from './dto/confirmar-venta.dto';

@Injectable()
export class VentasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(VentaEntity) private readonly ventaRepo: Repository<VentaEntity>,
    @InjectRepository(VentaItemEntity) private readonly itemRepo: Repository<VentaItemEntity>,
    @InjectRepository(SesionCajaEntity) private readonly sesionRepo: Repository<SesionCajaEntity>,
    @InjectRepository(ProductoEntity) private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(ProductoTipoEntity)
    private readonly tipoRepo: Repository<ProductoTipoEntity>,
    @InjectRepository(UbicacionEntity) private readonly ubicacionRepo: Repository<UbicacionEntity>,
    @InjectRepository(ProductoStockEntity) private readonly stockRepo: Repository<ProductoStockEntity>,
    @InjectRepository(AlteraEntity) private readonly alteraRepo: Repository<AlteraEntity>,
  ) {}

  private async getSesionAbiertaOrFail(userId: string) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');

    const sesion = await this.sesionRepo.findOne({
      where: { usuario: { idUsuario: userId }, fechaCierre: IsNull() },
      relations: { caja: true, usuario: true },
      order: { fechaApertura: 'DESC' },
    });

    if (!sesion) throw new ConflictException('No hay caja abierta (sesión abierta).');

    return sesion;
  }

  private assertVentaEditable(v: VentaEntity) {
    if (v.estado !== VentaEstado.EN_EDICION) {
      throw new ConflictException('La venta no está en edición.');
    }
  }

  private toVentaResponse(v: VentaEntity) {
    return {
      idVenta: v.idVenta,
      estado: v.estado,
      fechaCreacion: v.fechaCreacion,
      fechaConfirmacion: v.fechaConfirmacion ?? null,
      sesionCajaId: (v.sesionCaja as any)?.id,
      totalVenta: v.totalVenta,
      cantidadTotal: Number(v.cantidadTotal ?? 0),
      medioPago: v.medioPago ?? null,
      items: (v.items ?? []).map((it) => ({
        idItem: it.idItem,
        productoId: (it.producto as any)?.id,
        nombreProducto: (it.producto as any)?.name,
        precioUnitario: it.precioUnitario,
        cantidad: Number(it.cantidad ?? 0),
        subtotal: it.subtotal,
      })),
    };
  }

  private formatCantidad(value: number) {
    return value.toFixed(3);
  }

  private getUnidadBaseMeta(producto: ProductoEntity) {
    if (!producto?.unidadBase) {
      return { unidad: null, factorABase: null };
    }
    return { unidad: producto.unidadBase, factorABase: '1' };
  }

  private async assertProductoVendible(manager: EntityManager, productoId: string) {
    const tipoRepoTx = manager.getRepository(ProductoTipoEntity);
    const match = await tipoRepoTx.findOne({
      where: {
        producto: { id: productoId } as any,
        tipo: In([ProductoTipoEnum.REVENTA, ProductoTipoEnum.COMIDA]),
      },
    });

    if (!match) {
      throw new ConflictException('Producto no está habilitado para venta');
    }
  }

  private resolveInsumoFromGrupo(grupo: InsumoGrupoEntity | null) {
    if (!grupo?.isActive) return null;
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

  private async recomputeAndPersistTotals(
    manager: EntityManager,
    idVenta: number,
  ): Promise<{ totalVenta: string; cantidadTotal: string }> {
    const itemRepoTx = manager.getRepository(VentaItemEntity);
    const ventaRepoTx = manager.getRepository(VentaEntity);

    const row = await itemRepoTx
      .createQueryBuilder('it')
      .select('COALESCE(SUM(it.cantidad::numeric), 0)', 'cantidadTotal')
      .addSelect('COALESCE(SUM(it.subtotal::numeric), 0)', 'totalVenta')
      .where('it.id_venta = :idVenta', { idVenta })
      .getRawOne<{ cantidadTotal: string; totalVenta: string }>();

    const cantidadTotal = this.formatCantidad(Number(row?.cantidadTotal ?? 0));
    const totalVenta = Number(row?.totalVenta ?? 0).toFixed(2);

    await ventaRepoTx.update({ idVenta }, { cantidadTotal, totalVenta });

    return { cantidadTotal, totalVenta };
  }

  private async getVentaOrFail(
    manager: EntityManager,
    userId: string,
    idVenta: number,
    withItems = false,
  ) {
    const ventaRepoTx = manager.getRepository(VentaEntity);

    const venta = await ventaRepoTx.findOne({
      where: { idVenta },
      relations: withItems
        ? { sesionCaja: { usuario: true }, items: { producto: true } }
        : { sesionCaja: { usuario: true } },
    });

    if (!venta) throw new NotFoundException('Venta no encontrada');
    if ((venta.sesionCaja as any)?.usuario?.idUsuario !== userId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return venta;
  }

  // ---------- HU-CJ-03 ----------
  async crearVenta(userId: string) {
    const sesion = await this.getSesionAbiertaOrFail(userId);

    return this.dataSource.transaction(async (manager) => {
      const ventaRepoTx = manager.getRepository(VentaEntity);

    const venta = ventaRepoTx.create({
      estado: VentaEstado.EN_EDICION,
      sesionCaja: { id: sesion.id } as any,
      totalVenta: '0.00',
      cantidadTotal: '0.000',
      fechaConfirmacion: null,
    });

      const saved = await ventaRepoTx.save(venta);

      const full = await ventaRepoTx.findOne({
        where: { idVenta: saved.idVenta },
        relations: { sesionCaja: { usuario: true }, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }

  async obtenerVenta(userId: string, idVenta: number) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');

    const venta = await this.ventaRepo.findOne({
      where: { idVenta },
      relations: { sesionCaja: { usuario: true }, items: { producto: true } },
    });

    if (!venta) throw new NotFoundException('Venta no encontrada');
    if ((venta.sesionCaja as any)?.usuario?.idUsuario !== userId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.toVentaResponse(venta);
  }

  // ---------- HU-CJ-04 ----------
  async agregarItem(userId: string, idVenta: number, dto: AddItemVentaDto) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');

    await this.getSesionAbiertaOrFail(userId);

    if (!Number.isFinite(dto.cantidad) || dto.cantidad <= 0) {
      throw new BadRequestException('cantidad debe ser un número > 0');
    }
    return this.dataSource.transaction(async (manager) => {
      const itemRepoTx = manager.getRepository(VentaItemEntity);
      const productoRepoTx = manager.getRepository(ProductoEntity);

      const venta = await this.getVentaOrFail(manager, userId, idVenta, false);
      this.assertVentaEditable(venta);

      const producto = await productoRepoTx.findOne({ where: { id: dto.productoId } });
      if (!producto) throw new NotFoundException('Producto no encontrado');
      if (!producto.isActive) throw new ConflictException('Producto inactivo');

      await this.assertProductoVendible(manager, producto.id);

      const precioUnit = Number(producto.precioVenta ?? 0);
      if (!Number.isFinite(precioUnit) || precioUnit < 0) {
        throw new BadRequestException('Precio de venta inválido');
      }

      const existing = await itemRepoTx.findOne({
        where: {
          venta: { idVenta: venta.idVenta } as any,
          producto: { id: producto.id } as any,
        },
      });

      if (!existing) {
        await itemRepoTx.insert({
          venta: { idVenta: venta.idVenta } as any,
          producto: { id: producto.id } as any,
          cantidad: this.formatCantidad(Number(dto.cantidad)),
          precioUnitario: precioUnit.toFixed(2),
          subtotal: (precioUnit * Number(dto.cantidad)).toFixed(2),
        });
      } else {
        const nuevaCantidad = Number(existing.cantidad ?? 0) + Number(dto.cantidad);
        await itemRepoTx.update(
          { idItem: existing.idItem },
          {
            cantidad: this.formatCantidad(nuevaCantidad),
            precioUnitario: precioUnit.toFixed(2),
            subtotal: (precioUnit * nuevaCantidad).toFixed(2),
          },
        );
      }

      await this.recomputeAndPersistTotals(manager, venta.idVenta);

      const full = await manager.getRepository(VentaEntity).findOne({
        where: { idVenta: venta.idVenta },
        relations: { sesionCaja: { usuario: true }, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }

  async actualizarItem(userId: string, idVenta: number, idItem: number, dto: UpdateItemVentaDto) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');
    if (!Number.isFinite(idItem) || idItem <= 0) throw new BadRequestException('idItem inválido');

    await this.getSesionAbiertaOrFail(userId);

    if (!Number.isFinite(dto.cantidad) || dto.cantidad <= 0) {
      throw new BadRequestException('cantidad debe ser un número > 0');
    }

    return this.dataSource.transaction(async (manager) => {
      const itemRepoTx = manager.getRepository(VentaItemEntity);

      const venta = await this.getVentaOrFail(manager, userId, idVenta, false);
      this.assertVentaEditable(venta);

      const item = await itemRepoTx.findOne({
        where: { idItem, venta: { idVenta: venta.idVenta } as any },
      });
      if (!item) throw new NotFoundException('Ítem no encontrado');

      const precio = Number(item.precioUnitario);
      if (!Number.isFinite(precio) || precio < 0) throw new BadRequestException('Precio unitario inválido');

      await itemRepoTx.update(
        { idItem: item.idItem },
        {
          cantidad: this.formatCantidad(Number(dto.cantidad)),
          subtotal: (precio * Number(dto.cantidad)).toFixed(2),
        },
      );

      await this.recomputeAndPersistTotals(manager, venta.idVenta);

      const full = await manager.getRepository(VentaEntity).findOne({
        where: { idVenta: venta.idVenta },
        relations: { sesionCaja: { usuario: true }, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }


  async eliminarItem(userId: string, idVenta: number, idItem: number) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');
    if (!Number.isFinite(idItem) || idItem <= 0) throw new BadRequestException('idItem inválido');

    await this.getSesionAbiertaOrFail(userId);

    return this.dataSource.transaction(async (manager) => {
      const itemRepoTx = manager.getRepository(VentaItemEntity);

      const venta = await this.getVentaOrFail(manager, userId, idVenta, false);
      this.assertVentaEditable(venta);

      const exists = await itemRepoTx.findOne({
        where: { idItem, venta: { idVenta: venta.idVenta } as any },
      });
      if (!exists) throw new NotFoundException('Ítem no encontrado');

      await itemRepoTx.delete({ idItem: exists.idItem });

      await this.recomputeAndPersistTotals(manager, venta.idVenta);

      const full = await manager.getRepository(VentaEntity).findOne({
        where: { idVenta: venta.idVenta },
        relations: { sesionCaja: { usuario: true }, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }

  // ---------- HU-CJ-05 + HU-CJ-07 ----------
  async confirmarVenta(userId: string, idVenta: number, dto: ConfirmarVentaDto) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');

    await this.getSesionAbiertaOrFail(userId);

    return this.dataSource.transaction(async (manager) => {
      const ventaRepoTx = manager.getRepository(VentaEntity);
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const ubicacionRepoTx = manager.getRepository(UbicacionEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);
      const tipoRepoTx = manager.getRepository(ProductoTipoEntity);
      const recetaRepoTx = manager.getRepository(RecetaEntity);

      const ventaLocked = await ventaRepoTx.findOne({
        where: { idVenta },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ventaLocked) throw new NotFoundException('Venta no encontrada');

      const venta = await ventaRepoTx.findOne({
        where: { idVenta },
        relations: { sesionCaja: { usuario: true }, items: { producto: true } },
      });

      if (!venta) throw new NotFoundException('Venta no encontrada');
      if ((venta.sesionCaja as any)?.usuario?.idUsuario !== userId) {
        throw new ForbiddenException('Acceso denegado');
      }

      if (venta.estado !== VentaEstado.EN_EDICION) {
        throw new ConflictException('La venta no está en edición o ya fue confirmada.');
      }

      if (!dto?.medioPago) throw new BadRequestException('Debes seleccionar un medio de pago.');

      const totals = await this.recomputeAndPersistTotals(manager, venta.idVenta);

      if (Number(totals.totalVenta) <= 0) {
        throw new ConflictException('No se puede confirmar una venta con total igual a 0.');
      }

      const sala = await ubicacionRepoTx.findOne({
        where: { tipo: 'SALA_VENTA', activa: true },
        order: { createdAt: 'ASC' },
      });
      if (!sala) throw new ConflictException('No hay sala de ventas activa.');

      const items = venta.items ?? [];
      if (items.length === 0) {
        throw new ConflictException('No se puede confirmar una venta sin productos.');
      }

      const productoIds = items
        .map((it) => (it.producto as any)?.id)
        .filter((id) => !!id) as string[];
      const comidaRows = await tipoRepoTx.find({
        where: { producto: { id: In(productoIds) } as any, tipo: ProductoTipoEnum.COMIDA } as any,
        relations: { producto: true },
      });
      const comidasSet = new Set(comidaRows.map((r) => r.producto?.id).filter(Boolean) as string[]);

      const insumoRequired = new Map<string, { producto: ProductoEntity; cantidad: number }>();

      for (const it of items) {
        const productoId = (it.producto as any)?.id as string | undefined;
        if (!productoId || !comidasSet.has(productoId)) continue;

        const recetas = await recetaRepoTx.find({
          where: { comida: { id: productoId } as any },
          relations: { grupo: { items: { producto: true } } },
          order: { id: 'ASC' },
        });

        if (!recetas || recetas.length === 0) {
          const nombre = (it.producto as any)?.name ?? 'Preparación';
          throw new ConflictException(`La preparación ${nombre} no tiene receta definida.`);
        }

        const cantidadVenta = Number(it.cantidad ?? 0);
        if (!Number.isFinite(cantidadVenta) || cantidadVenta <= 0) {
          throw new BadRequestException('Cantidad inválida en la venta.');
        }

        for (const r of recetas) {
          const insumo = this.resolveInsumoFromGrupo(r.grupo ?? null);
          if (!insumo) {
            const grupoName = r.grupo?.name ?? 'Grupo';
            throw new ConflictException(`El grupo ${grupoName} no tiene insumos activos.`);
          }

          const cantidadBase = Number(r.cantidadBase ?? 0);
          if (!Number.isFinite(cantidadBase) || cantidadBase <= 0) {
            throw new BadRequestException('Cantidad de receta inválida.');
          }

          const cantidadConsumo = cantidadBase * cantidadVenta;
          const prev = insumoRequired.get(insumo.id);
          if (prev) {
            prev.cantidad += cantidadConsumo;
          } else {
            insumoRequired.set(insumo.id, { producto: insumo, cantidad: cantidadConsumo });
          }
        }
      }

      const insumoStockRows = new Map<string, ProductoStockEntity>();
      for (const [insumoId, data] of insumoRequired) {
        const stockRow = await stockRepoTx.findOne({
          where: { producto: { id: insumoId } as any, ubicacion: { id: sala.id } as any },
          lock: { mode: 'pessimistic_write' },
        });

        if (!stockRow) {
          throw new ConflictException(`Stock no inicializado para insumo ${data.producto.name}.`);
        }

        const disponible = Number(stockRow.cantidad ?? 0);
        if (disponible < data.cantidad) {
          throw new ConflictException(
            `Stock insuficiente de insumo ${data.producto.name}. Disponible: ${disponible}.`,
          );
        }

        insumoStockRows.set(insumoId, stockRow);
      }

      for (const it of items) {
        const productoId = (it.producto as any)?.id;
        if (!productoId) throw new BadRequestException('Producto inválido en la venta.');
        if (comidasSet.has(productoId)) {
          continue;
        }

        const stockRow = await stockRepoTx.findOne({
          where: {
            producto: { id: productoId } as any,
            ubicacion: { id: sala.id } as any,
          },
          lock: { mode: 'pessimistic_write' },
        });

        const disponible = Number(stockRow?.cantidad ?? 0);
        const cantidad = Number(it.cantidad ?? 0);
        if (disponible < cantidad) {
          const nombre = (it.producto as any)?.name ?? 'Producto';
          throw new ConflictException(
            `Stock insuficiente para ${nombre}. Disponible: ${disponible}.`,
          );
        }
      }

      for (const it of items) {
        const productoId = (it.producto as any)?.id;
        if (comidasSet.has(productoId)) {
          continue;
        }
        const stockRow = await stockRepoTx.findOne({
          where: {
            producto: { id: productoId } as any,
            ubicacion: { id: sala.id } as any,
          },
          lock: { mode: 'pessimistic_write' },
        });

        const disponible = Number(stockRow?.cantidad ?? 0);
        if (!stockRow) {
          throw new ConflictException('Stock no inicializado para un producto.');
        }

        const cantidad = Number(it.cantidad ?? 0);

        stockRow.cantidad = this.formatCantidad(disponible - cantidad);
        await stockRepoTx.save(stockRow);

        const unidadMeta = this.getUnidadBaseMeta(it.producto as ProductoEntity);
        const mov = alteraRepoTx.create({
          tipo: 'SALIDA',
          cantidad: this.formatCantidad(cantidad),
          unidad: unidadMeta.unidad,
          factorABase: unidadMeta.factorABase,
          motivo: `Salida por venta #${venta.idVenta}`,
          producto: { id: productoId } as ProductoEntity,
          ubicacion: sala,
          origen: null,
          destino: null,
          usuario: { idUsuario: userId } as any,
          venta: { idVenta: venta.idVenta } as any,
        });

        await alteraRepoTx.save(mov);
      }

      for (const [insumoId, data] of insumoRequired) {
        const stockRow = insumoStockRows.get(insumoId);
        if (!stockRow) {
          throw new ConflictException('Stock no inicializado para un insumo.');
        }

        const disponible = Number(stockRow.cantidad ?? 0);
        stockRow.cantidad = this.formatCantidad(disponible - data.cantidad);
        await stockRepoTx.save(stockRow);

        const unidadMeta = this.getUnidadBaseMeta(data.producto);
        const mov = alteraRepoTx.create({
          tipo: 'SALIDA',
          cantidad: this.formatCantidad(data.cantidad),
          unidad: unidadMeta.unidad,
          factorABase: unidadMeta.factorABase,
          motivo: `Consumo receta venta #${venta.idVenta}`,
          producto: { id: insumoId } as ProductoEntity,
          ubicacion: sala,
          origen: null,
          destino: null,
          usuario: { idUsuario: userId } as any,
          venta: { idVenta: venta.idVenta } as any,
        });

        await alteraRepoTx.save(mov);
      }

      await ventaRepoTx.update(
        { idVenta: venta.idVenta },
        {
          estado: VentaEstado.CONFIRMADA,
          fechaConfirmacion: new Date(),
          totalVenta: totals.totalVenta,
          cantidadTotal: totals.cantidadTotal,
          medioPago: dto.medioPago,
        },
      );

      const full = await ventaRepoTx.findOne({
        where: { idVenta: venta.idVenta },
        relations: { sesionCaja: { usuario: true }, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }

  async listarVentas(userId: string, sesionCajaId?: number) {
    if (!userId) throw new BadRequestException('Token inválido');

    const where: any = { sesionCaja: { usuario: { idUsuario: userId } } };

    if (sesionCajaId !== undefined) {
      if (!Number.isFinite(sesionCajaId) || sesionCajaId <= 0) {
        throw new BadRequestException('sesionCajaId inválido');
      }
      where.sesionCaja = { id: sesionCajaId };
    }

    const ventas = await this.ventaRepo.find({
      where,
      relations: { items: true },
      order: { fechaCreacion: 'DESC' },
      take: 50,
    });

    return ventas.map((v) => ({
      idVenta: v.idVenta,
      estado: v.estado,
      fechaCreacion: v.fechaCreacion,
      fechaConfirmacion: v.fechaConfirmacion ?? null,
      totalVenta: v.totalVenta,
      cantidadTotal: Number(v.cantidadTotal ?? 0),
      medioPago: v.medioPago,
    }));
  }

  async eliminarVenta(userId: string, idVenta: number) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');

    const sesionAbierta = await this.getSesionAbiertaOrFail(userId);

    return this.dataSource.transaction(async (manager) => {
      const ventaRepoTx = manager.getRepository(VentaEntity);
      const itemRepoTx = manager.getRepository(VentaItemEntity);

      const venta = await ventaRepoTx.findOne({
        where: { idVenta },
        relations: { sesionCaja: { usuario: true } },
      });

      if (!venta) throw new NotFoundException('Venta no encontrada');
      if ((venta.sesionCaja as any)?.usuario?.idUsuario !== userId) {
        throw new ForbiddenException('Acceso denegado');
      }

      if ((venta.sesionCaja as any)?.id !== sesionAbierta.id) {
        throw new ForbiddenException('No puedes eliminar una venta de otra sesión.');
      }

      if (venta.estado !== VentaEstado.EN_EDICION) {
        throw new ConflictException('Solo se pueden eliminar ventas en edición.');
      }

      await itemRepoTx.delete({ venta: { idVenta: venta.idVenta } as any });
      await ventaRepoTx.delete({ idVenta: venta.idVenta });

      return { ok: true };
    });
  }
}
