import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';

import { HistorialEntity } from '../historial/entities/historial.entity';
import { CajaEstado } from '../caja/entities/caja.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';

import { MedioPago, VentaEntity, VentaEstado } from './entities/venta.entity';
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
    @InjectRepository(HistorialEntity) private readonly historialRepo: Repository<HistorialEntity>,
    @InjectRepository(ProductoEntity) private readonly productoRepo: Repository<ProductoEntity>,
  ) {}

  private async getHistorialAbiertoOrFail(userId: string) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');

    const historial = await this.historialRepo.findOne({
      where: { usuario: { id: userId }, fechaCierre: IsNull() },
      relations: { caja: true, usuario: true },
    });

    if (!historial?.caja) throw new ConflictException('No hay caja abierta.');
    if (historial.caja.estado !== CajaEstado.ABIERTA) throw new ConflictException('La caja no está abierta.');

    return historial;
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
      usuarioId: (v.usuario as any)?.id,
      historialId: (v.historial as any)?.idHistorial,
      totalVenta: v.totalVenta,
      cantidadTotal: v.cantidadTotal,
      items: (v.items ?? []).map((it) => ({
        idItem: it.idItem,
        productoId: (it.producto as any)?.id,
        nombreProducto: (it.producto as any)?.name,
        precioUnitario: it.precioUnitario,
        cantidad: it.cantidad,
        subtotal: it.subtotal,
      })),
    };
  }


  private async recomputeAndPersistTotals(
    manager: EntityManager,
    idVenta: number,
  ): Promise<{ totalVenta: string; cantidadTotal: number }> {
    const itemRepoTx = manager.getRepository(VentaItemEntity);
    const ventaRepoTx = manager.getRepository(VentaEntity);

    const row = await itemRepoTx
      .createQueryBuilder('it')
      .select('COALESCE(SUM(it.cantidad), 0)', 'cantidadTotal')
      .addSelect('COALESCE(SUM(it.subtotal::numeric), 0)', 'totalVenta')
      .where('it.id_venta = :idVenta', { idVenta })
      .getRawOne<{ cantidadTotal: string; totalVenta: string }>();

    const cantidadTotal = Number(row?.cantidadTotal ?? 0);
    const totalVenta = Number(row?.totalVenta ?? 0).toFixed(2);

    await ventaRepoTx.update(
      { idVenta },
      { cantidadTotal, totalVenta },
    );

    return { cantidadTotal, totalVenta };
  }

  private async getVentaOrFail(
    manager: any,
    userId: string,
    idVenta: number,
    withItems = false,
  ) {
    const ventaRepoTx = manager.getRepository(VentaEntity);

    const venta = await ventaRepoTx.findOne({
      where: { idVenta },
      relations: withItems
        ? { usuario: true, historial: true, items: { producto: true } }
        : { usuario: true, historial: true },
    });

    if (!venta) throw new NotFoundException('Venta no encontrada');
    if ((venta.usuario as any)?.id !== userId) throw new ForbiddenException('Acceso denegado');

    return venta;
  }

  // ---------- HU-CJ-03 ----------
  async crearVenta(userId: string) {
    const historial = await this.getHistorialAbiertoOrFail(userId);

    return this.dataSource.transaction(async (manager) => {
      const ventaRepoTx = manager.getRepository(VentaEntity);

      const venta = ventaRepoTx.create({
        estado: VentaEstado.EN_EDICION,
        usuario: { id: userId } as any,
        historial: { idHistorial: historial.idHistorial } as any,
        totalVenta: '0.00',
        cantidadTotal: 0,
        fechaConfirmacion: null,
      });

      const saved = await ventaRepoTx.save(venta);

      const full = await ventaRepoTx.findOne({
        where: { idVenta: saved.idVenta },
        relations: { usuario: true, historial: true, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }

  async obtenerVenta(userId: string, idVenta: number) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');

    const venta = await this.ventaRepo.findOne({
      where: { idVenta },
      relations: { usuario: true, historial: true, items: { producto: true } },
    });

    if (!venta) throw new NotFoundException('Venta no encontrada');
    if ((venta.usuario as any)?.id !== userId) throw new ForbiddenException('Acceso denegado');

    return this.toVentaResponse(venta);
  }

  // ---------- HU-CJ-04 ----------
  async agregarItem(userId: string, idVenta: number, dto: AddItemVentaDto) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');

    await this.getHistorialAbiertoOrFail(userId);

    if (!Number.isInteger(dto.cantidad) || dto.cantidad < 1) {
      throw new BadRequestException('cantidad debe ser entero >= 1');
    }

    return this.dataSource.transaction(async (manager) => {
      const itemRepoTx = manager.getRepository(VentaItemEntity);
      const productoRepoTx = manager.getRepository(ProductoEntity);

      const venta = await this.getVentaOrFail(manager, userId, idVenta, false);
      this.assertVentaEditable(venta);

      const producto = await productoRepoTx.findOne({ where: { id: dto.productoId } });
      if (!producto) throw new NotFoundException('Producto no encontrado');
      if (!producto.isActive) throw new ConflictException('Producto inactivo');

      const precioUnit = Number(producto.precioVenta);
      if (!Number.isFinite(precioUnit) || precioUnit < 0) throw new BadRequestException('Precio de venta inválido');

      // Buscar si ya existe el item para ese producto
      const existing = await itemRepoTx.findOne({
        where: {
          venta: { idVenta: venta.idVenta } as any,
          producto: { id: producto.id } as any,
        },
      });

      if (!existing) {
        // INSERT directo: nunca toca id_venta en updates raros
        await itemRepoTx.insert({
          venta: { idVenta: venta.idVenta } as any,
          producto: { id: producto.id } as any,
          cantidad: dto.cantidad,
          precioUnitario: precioUnit.toFixed(2),
          subtotal: (precioUnit * dto.cantidad).toFixed(2),
        });
      } else {
        const nuevaCantidad = existing.cantidad + dto.cantidad;
        await itemRepoTx.update(
          { idItem: existing.idItem },
          {
            cantidad: nuevaCantidad,
            precioUnitario: precioUnit.toFixed(2),
            subtotal: (precioUnit * nuevaCantidad).toFixed(2),
          },
        );
      }

      // Recalcular total/cantidad y persistir en venta
      await this.recomputeAndPersistTotals(manager, venta.idVenta);

      // devolver venta completa
      const full = await manager.getRepository(VentaEntity).findOne({
        where: { idVenta: venta.idVenta },
        relations: { usuario: true, historial: true, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }

  async actualizarItem(userId: string, idVenta: number, idItem: number, dto: UpdateItemVentaDto) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');
    if (!Number.isFinite(idItem) || idItem <= 0) throw new BadRequestException('idItem inválido');

    await this.getHistorialAbiertoOrFail(userId);

    if (!Number.isInteger(dto.cantidad) || dto.cantidad < 1) {
      throw new BadRequestException('cantidad debe ser entero >= 1');
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

      // UPDATE parcial (NO toca id_venta)
      await itemRepoTx.update(
        { idItem: item.idItem },
        {
          cantidad: dto.cantidad,
          subtotal: (precio * dto.cantidad).toFixed(2),
        },
      );

      await this.recomputeAndPersistTotals(manager, venta.idVenta);

      const full = await manager.getRepository(VentaEntity).findOne({
        where: { idVenta: venta.idVenta },
        relations: { usuario: true, historial: true, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }

  async eliminarItem(userId: string, idVenta: number, idItem: number) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');
    if (!Number.isFinite(idItem) || idItem <= 0) throw new BadRequestException('idItem inválido');

    await this.getHistorialAbiertoOrFail(userId);

    return this.dataSource.transaction(async (manager) => {
      const itemRepoTx = manager.getRepository(VentaItemEntity);

      const venta = await this.getVentaOrFail(manager, userId, idVenta, false);
      this.assertVentaEditable(venta);

      const exists = await itemRepoTx.findOne({
        where: { idItem, venta: { idVenta: venta.idVenta } as any },
      });
      if (!exists) throw new NotFoundException('Ítem no encontrado');

      // DELETE directo: no nullifica FK
      await itemRepoTx.delete({ idItem: exists.idItem });

      await this.recomputeAndPersistTotals(manager, venta.idVenta);

      const full = await manager.getRepository(VentaEntity).findOne({
        where: { idVenta: venta.idVenta },
        relations: { usuario: true, historial: true, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }

  // ---------- HU-CJ-05 + HU-CJ-07 ----------
  async confirmarVenta(userId: string, idVenta: number, dto: ConfirmarVentaDto) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) {
      throw new BadRequestException('idVenta inválido');
    }

    await this.getHistorialAbiertoOrFail(userId);

    return this.dataSource.transaction(async (manager) => {
      const ventaRepoTx = manager.getRepository(VentaEntity);

      const venta = await this.getVentaOrFail(manager, userId, idVenta, false);

      if (venta.estado !== VentaEstado.EN_EDICION) {
        throw new ConflictException('La venta no está en edición o ya fue confirmada.');
      }

      // seguridad defensiva (si por algún motivo no corrió ValidationPipe)
      if (!dto?.medioPago) {
        throw new BadRequestException('Debes seleccionar un medio de pago.');
      }

      const totals = await this.recomputeAndPersistTotals(manager, venta.idVenta);

      // si recompute no valida items, deja este check
      if (Number(totals.totalVenta) <= 0) {
        throw new ConflictException('No se puede confirmar una venta con total igual a 0.');
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
        relations: { usuario: true, historial: true, items: { producto: true } },
      });

      return this.toVentaResponse(full!);
    });
  }


    async listarVentas(userId: string, historialId?: number) {
    if (!userId) throw new BadRequestException('Token inválido');

    const where: any = { usuario: { id: userId } };

    if (historialId !== undefined) {
        if (!Number.isFinite(historialId) || historialId <= 0) {
        throw new BadRequestException('historialId inválido');
        }
        where.historial = { idHistorial: historialId };
    }

    const ventas = await this.ventaRepo.find({
        where,
        relations: { items: true }, // opcional (para mostrar cantidad)
        order: { fechaCreacion: 'DESC' },
        take: 50,
    });

    return ventas.map(v => ({
        idVenta: v.idVenta,
        estado: v.estado,
        fechaCreacion: v.fechaCreacion,
        fechaConfirmacion: v.fechaConfirmacion ?? null,
        totalVenta: v.totalVenta,
        cantidadTotal: v.cantidadTotal,
        medioPago: v.medioPago,
    }));
  }

  async eliminarVenta(userId: string, idVenta: number) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) throw new BadRequestException('idVenta inválido');

    // obliga caja/historial abierto
    const historialAbierto = await this.getHistorialAbiertoOrFail(userId);

    return this.dataSource.transaction(async (manager) => {
      const ventaRepoTx = manager.getRepository(VentaEntity);
      const itemRepoTx = manager.getRepository(VentaItemEntity);

      const venta = await ventaRepoTx.findOne({
        where: { idVenta },
        relations: { usuario: true, historial: true },
      });

      if (!venta) throw new NotFoundException('Venta no encontrada');
      if ((venta.usuario as any)?.id !== userId) throw new ForbiddenException('Acceso denegado');

      // seguridad extra: solo borrar ventas del turno actual
      if ((venta.historial as any)?.idHistorial !== historialAbierto.idHistorial) {
        throw new ForbiddenException('No puedes eliminar una venta de otro turno.');
      }

      if (venta.estado !== VentaEstado.EN_EDICION) {
        throw new ConflictException('Solo se pueden eliminar ventas en edición.');
      }

      // borrar items primero (FK)
      await itemRepoTx.delete({ venta: { idVenta: venta.idVenta } as any });

      // borrar venta
      await ventaRepoTx.delete({ idVenta: venta.idVenta });

      return { ok: true };
    });
  }

}
