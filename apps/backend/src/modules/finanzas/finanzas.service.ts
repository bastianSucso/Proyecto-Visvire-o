import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateIngresoExternoDto } from './dto/create-ingreso-externo.dto';
import { CreateEgresoManualDto } from './dto/create-egreso-manual.dto';
import { ListarMovimientosFinancierosDto } from './dto/listar-movimientos-financieros.dto';
import { UpdateMovimientoManualDto } from './dto/update-movimiento-manual.dto';
import {
  ConsultarPeriodoFinancieroDto,
  PeriodoFinanciero,
} from './dto/consultar-periodo-financiero.dto';
import {
  MovimientoFinancieroEntity,
  MovimientoFinancieroEstado,
  MovimientoFinancieroMetodoPago,
  MovimientoFinancieroOrigenTipo,
  MovimientoFinancieroTipo,
} from './entities/movimiento-financiero.entity';

type RegistroAutomaticoInput = {
  tipo: MovimientoFinancieroTipo;
  origenTipo: MovimientoFinancieroOrigenTipo;
  origenId: string;
  monto: number;
  categoria: string;
  descripcion?: string | null;
  fechaMovimiento: Date;
  metodoPago?: MovimientoFinancieroMetodoPago | null;
  referencia?: string | null;
  aplicaCreditoFiscal?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class FinanzasService {
  private readonly businessTimeZone = 'America/Santiago';

  constructor(
    @InjectRepository(MovimientoFinancieroEntity)
    private readonly movimientoRepo: Repository<MovimientoFinancieroEntity>,
  ) {}

  private getRepository(manager?: EntityManager) {
    return manager
      ? manager.getRepository(MovimientoFinancieroEntity)
      : this.movimientoRepo;
  }

  private normalizeCategoria(categoria: string) {
    return categoria.trim().toUpperCase();
  }

  private assertMovimientoManualEditable(mov: MovimientoFinancieroEntity) {
    if (mov.estado !== MovimientoFinancieroEstado.ACTIVO) {
      throw new BadRequestException('Solo se pueden modificar movimientos activos');
    }

    if (
      mov.origenTipo !== MovimientoFinancieroOrigenTipo.EXTERNO_MANUAL &&
      mov.origenTipo !== MovimientoFinancieroOrigenTipo.EGRESO_MANUAL
    ) {
      throw new BadRequestException('Solo se pueden modificar movimientos manuales');
    }
  }

  private assertMontoValido(monto: number) {
    if (!Number.isFinite(monto) || monto <= 0) {
      throw new BadRequestException('monto debe ser un número > 0');
    }
  }

  private toResponse(mov: MovimientoFinancieroEntity) {
    return {
      id: mov.id,
      tipo: mov.tipo,
      origenTipo: mov.origenTipo,
      origenId: mov.origenId,
      monto: Number(mov.monto ?? 0),
      moneda: mov.moneda,
      categoria: mov.categoria,
      descripcion: mov.descripcion,
      metodoPago: mov.metodoPago,
      referencia: mov.referencia,
      fechaMovimiento: mov.fechaMovimiento,
      aplicaCreditoFiscal: mov.aplicaCreditoFiscal,
      ivaTasa: Number(mov.ivaTasa ?? 0),
      metadata: mov.metadata,
      estado: mov.estado,
      createdAt: mov.createdAt,
      createdBy: mov.createdBy
        ? {
            idUsuario: mov.createdBy.idUsuario,
            email: mov.createdBy.email,
          }
        : null,
    };
  }

  async registrarIngresoExterno(dto: CreateIngresoExternoDto, userId: string) {
    this.assertMontoValido(dto.monto);

    const categoria = this.normalizeCategoria(dto.categoria);
    const aplicaCredito = dto.aplicaCreditoFiscal ?? false;

    const mov = this.movimientoRepo.create({
      tipo: MovimientoFinancieroTipo.INGRESO,
      origenTipo: MovimientoFinancieroOrigenTipo.EXTERNO_MANUAL,
      origenId: null,
      monto: dto.monto.toFixed(2),
      moneda: 'CLP',
      categoria,
      descripcion: dto.descripcion?.trim() || null,
      metodoPago: dto.metodoPago ?? null,
      referencia: dto.referencia?.trim() || null,
      fechaMovimiento: dto.fechaMovimiento ? new Date(dto.fechaMovimiento) : new Date(),
      aplicaCreditoFiscal: aplicaCredito,
      ivaTasa: '0.1900',
      metadata: null,
      estado: MovimientoFinancieroEstado.ACTIVO,
      createdBy: { idUsuario: userId } as any,
      anuladoAt: null,
      anuladoBy: null,
      anuladoMotivo: null,
    });

    const saved = await this.movimientoRepo.save(mov);
    const withRelations = await this.movimientoRepo.findOne({
      where: { id: saved.id },
      relations: { createdBy: true },
    });

    return this.toResponse(withRelations ?? saved);
  }

  async registrarEgresoManual(dto: CreateEgresoManualDto, userId: string) {
    this.assertMontoValido(dto.monto);

    const categoria = this.normalizeCategoria(dto.categoria);
    const aplicaCredito = dto.aplicaCreditoFiscal ?? false;

    const mov = this.movimientoRepo.create({
      tipo: MovimientoFinancieroTipo.EGRESO,
      origenTipo: MovimientoFinancieroOrigenTipo.EGRESO_MANUAL,
      origenId: null,
      monto: dto.monto.toFixed(2),
      moneda: 'CLP',
      categoria,
      descripcion: dto.descripcion?.trim() || null,
      metodoPago: dto.metodoPago ?? null,
      referencia: dto.referencia?.trim() || null,
      fechaMovimiento: dto.fechaMovimiento ? new Date(dto.fechaMovimiento) : new Date(),
      aplicaCreditoFiscal: aplicaCredito,
      ivaTasa: '0.1900',
      metadata: null,
      estado: MovimientoFinancieroEstado.ACTIVO,
      createdBy: { idUsuario: userId } as any,
      anuladoAt: null,
      anuladoBy: null,
      anuladoMotivo: null,
    });

    const saved = await this.movimientoRepo.save(mov);
    const withRelations = await this.movimientoRepo.findOne({
      where: { id: saved.id },
      relations: { createdBy: true },
    });

    return this.toResponse(withRelations ?? saved);
  }

  private applyDateFilter(
    qb: SelectQueryBuilder<MovimientoFinancieroEntity>,
    alias: string,
    from?: string,
    to?: string,
  ) {
    if (from) {
      qb.andWhere(`DATE(${alias}.fecha_movimiento AT TIME ZONE :tz) >= :from`, {
        from: from.slice(0, 10),
        tz: this.businessTimeZone,
      });
    }

    if (to) {
      qb.andWhere(`DATE(${alias}.fecha_movimiento AT TIME ZONE :tz) <= :to`, {
        to: to.slice(0, 10),
        tz: this.businessTimeZone,
      });
    }
  }

  async listarIngresosExternos(dto: ListarMovimientosFinancierosDto) {
    const qb = this.movimientoRepo
      .createQueryBuilder('mov')
      .leftJoinAndSelect('mov.createdBy', 'createdBy')
      .where('mov.estado = :estado', { estado: MovimientoFinancieroEstado.ACTIVO })
      .andWhere('mov.tipo = :tipo', { tipo: MovimientoFinancieroTipo.INGRESO })
      .andWhere('mov.origen_tipo = :origenTipo', {
        origenTipo: MovimientoFinancieroOrigenTipo.EXTERNO_MANUAL,
      })
      .orderBy('mov.fecha_movimiento', 'DESC');

    this.applyDateFilter(qb, 'mov', dto.from, dto.to);

    if (dto.categoria?.trim()) {
      qb.andWhere('mov.categoria = :categoria', {
        categoria: this.normalizeCategoria(dto.categoria),
      });
    }

    const items = await qb.getMany();
    return items.map((it) => this.toResponse(it));
  }

  async listarEgresosManuales(dto: ListarMovimientosFinancierosDto) {
    const qb = this.movimientoRepo
      .createQueryBuilder('mov')
      .leftJoinAndSelect('mov.createdBy', 'createdBy')
      .where('mov.estado = :estado', { estado: MovimientoFinancieroEstado.ACTIVO })
      .andWhere('mov.tipo = :tipo', { tipo: MovimientoFinancieroTipo.EGRESO })
      .andWhere('mov.origen_tipo = :origenTipo', {
        origenTipo: MovimientoFinancieroOrigenTipo.EGRESO_MANUAL,
      })
      .orderBy('mov.fecha_movimiento', 'DESC');

    this.applyDateFilter(qb, 'mov', dto.from, dto.to);

    if (dto.categoria?.trim()) {
      qb.andWhere('mov.categoria = :categoria', {
        categoria: this.normalizeCategoria(dto.categoria),
      });
    }

    const items = await qb.getMany();
    return items.map((it) => this.toResponse(it));
  }

  async listarMovimientos(dto: ListarMovimientosFinancierosDto) {
    const qb = this.movimientoRepo
      .createQueryBuilder('mov')
      .leftJoinAndSelect('mov.createdBy', 'createdBy')
      .where('mov.estado = :estado', { estado: MovimientoFinancieroEstado.ACTIVO })
      .orderBy('mov.fecha_movimiento', 'DESC')
      .addOrderBy('mov.created_at', 'DESC');

    this.applyDateFilter(qb, 'mov', dto.from, dto.to);

    if (dto.categoria?.trim()) {
      qb.andWhere('mov.categoria = :categoria', {
        categoria: this.normalizeCategoria(dto.categoria),
      });
    }

    if (dto.tipo) {
      qb.andWhere('mov.tipo = :tipo', { tipo: dto.tipo });
    }

    if (dto.origenTipo) {
      qb.andWhere('mov.origen_tipo = :origenTipo', { origenTipo: dto.origenTipo });
    }

    const items = await qb.getMany();
    return items.map((it) => this.toResponse(it));
  }

  async actualizarMovimientoManual(id: string, dto: UpdateMovimientoManualDto) {
    const mov = await this.movimientoRepo.findOne({
      where: { id },
      relations: { createdBy: true },
    });

    if (!mov) {
      throw new BadRequestException('Movimiento financiero no encontrado');
    }

    this.assertMovimientoManualEditable(mov);

    const payload: Partial<MovimientoFinancieroEntity> = {};

    if (dto.monto !== undefined) {
      this.assertMontoValido(dto.monto);
      payload.monto = dto.monto.toFixed(2);
    }

    if (dto.categoria !== undefined) {
      payload.categoria = this.normalizeCategoria(dto.categoria);
    }

    if (dto.descripcion !== undefined) {
      payload.descripcion = dto.descripcion?.trim() || null;
    }

    if (dto.metodoPago !== undefined) {
      payload.metodoPago = dto.metodoPago ?? null;
    }

    if (dto.referencia !== undefined) {
      payload.referencia = dto.referencia?.trim() || null;
    }

    if (dto.fechaMovimiento !== undefined) {
      payload.fechaMovimiento = new Date(dto.fechaMovimiento);
    }

    if (
      dto.aplicaCreditoFiscal !== undefined &&
      (mov.origenTipo === MovimientoFinancieroOrigenTipo.EGRESO_MANUAL ||
        mov.origenTipo === MovimientoFinancieroOrigenTipo.EXTERNO_MANUAL)
    ) {
      payload.aplicaCreditoFiscal = dto.aplicaCreditoFiscal;
    }

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('No se enviaron campos para actualizar');
    }

    Object.assign(mov, payload);
    await this.movimientoRepo.save(mov);

    const updated = await this.movimientoRepo.findOne({
      where: { id: mov.id },
      relations: { createdBy: true },
    });

    return this.toResponse(updated ?? mov);
  }

  async anularMovimientoManual(id: string, userId: string, motivo?: string) {
    const mov = await this.movimientoRepo.findOne({
      where: { id },
      relations: { createdBy: true },
    });

    if (!mov) {
      throw new BadRequestException('Movimiento financiero no encontrado');
    }

    this.assertMovimientoManualEditable(mov);

    mov.estado = MovimientoFinancieroEstado.ANULADO;
    mov.anuladoAt = new Date();
    mov.anuladoBy = { idUsuario: userId } as any;
    mov.anuladoMotivo = motivo?.trim() || null;
    await this.movimientoRepo.save(mov);

    const updated = await this.movimientoRepo.findOne({
      where: { id: mov.id },
      relations: { createdBy: true },
    });

    return this.toResponse(updated ?? mov);
  }

  private getBusinessDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.businessTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((item) => item.type === 'year')?.value ?? '0000';
    const month = parts.find((item) => item.type === 'month')?.value ?? '01';
    const day = parts.find((item) => item.type === 'day')?.value ?? '01';
    return `${year}-${month}-${day}`;
  }

  private getDateBounds(periodo?: PeriodoFinanciero, from?: string, to?: string) {
    if ((from && !to) || (!from && to)) {
      throw new BadRequestException('Debes enviar from y to juntos');
    }

    if (from && to) {
      const fromDate = from.slice(0, 10);
      const toDate = to.slice(0, 10);
      if (fromDate > toDate) {
        throw new BadRequestException('from no puede ser mayor a to');
      }
      return { fromDate, toDate };
    }

    const today = this.getBusinessDateKey(new Date());
    const [yy, mm, dd] = today.split('-').map((value) => Number(value));
    const cursor = new Date(Date.UTC(yy, mm - 1, dd, 12, 0, 0));

    if ((periodo ?? 'mes') === 'hoy') {
      return { fromDate: today, toDate: today };
    }

    if ((periodo ?? 'mes') === 'semana') {
      const start = new Date(cursor);
      start.setUTCDate(cursor.getUTCDate() - 6);
      return {
        fromDate: start.toISOString().slice(0, 10),
        toDate: today,
      };
    }

    return {
      fromDate: `${today.slice(0, 8)}01`,
      toDate: today,
    };
  }

  async obtenerIva(dto: ConsultarPeriodoFinancieroDto) {
    const { fromDate, toDate } = this.getDateBounds(dto.periodo, dto.from, dto.to);

    const debitoRow = await this.movimientoRepo
      .createQueryBuilder('mov')
      .select('COALESCE(SUM((mov.monto::numeric) * (mov.iva_tasa::numeric)), 0)', 'ivaDebito')
      .where('mov.estado = :estado', { estado: MovimientoFinancieroEstado.ACTIVO })
      .andWhere('mov.tipo = :tipo', { tipo: MovimientoFinancieroTipo.INGRESO })
      .andWhere(
        '((mov.origen_tipo IN (:...origenesVenta)) OR (mov.origen_tipo = :origenExterno AND mov.aplica_credito_fiscal = :externoAfecto))',
        {
          origenesVenta: [
            MovimientoFinancieroOrigenTipo.VENTA_POS,
            MovimientoFinancieroOrigenTipo.VENTA_ALOJAMIENTO,
          ],
          origenExterno: MovimientoFinancieroOrigenTipo.EXTERNO_MANUAL,
          externoAfecto: true,
        },
      )
      .andWhere('DATE(mov.fecha_movimiento AT TIME ZONE :tz) BETWEEN :fromDate AND :toDate', {
        tz: this.businessTimeZone,
        fromDate,
        toDate,
      })
      .getRawOne<{ ivaDebito: string }>();

    const creditoRow = await this.movimientoRepo
      .createQueryBuilder('mov')
      .select('COALESCE(SUM((mov.monto::numeric) * (mov.iva_tasa::numeric)), 0)', 'ivaCredito')
      .where('mov.estado = :estado', { estado: MovimientoFinancieroEstado.ACTIVO })
      .andWhere('mov.tipo = :tipo', { tipo: MovimientoFinancieroTipo.EGRESO })
      .andWhere('mov.aplica_credito_fiscal = :aplica', { aplica: true })
      .andWhere('DATE(mov.fecha_movimiento AT TIME ZONE :tz) BETWEEN :fromDate AND :toDate', {
        tz: this.businessTimeZone,
        fromDate,
        toDate,
      })
      .getRawOne<{ ivaCredito: string }>();

    const ivaDebito = Number(debitoRow?.ivaDebito ?? 0);
    const ivaCredito = Number(creditoRow?.ivaCredito ?? 0);
    const ivaNeto = Number((ivaDebito - ivaCredito).toFixed(2));

    const estadoIva = ivaNeto > 0 ? 'IVA_A_PAGAR' : ivaNeto < 0 ? 'REMANENTE_A_FAVOR' : 'SIN_DIFERENCIA';

    return {
      periodo: { from: fromDate, to: toDate, timeZone: this.businessTimeZone },
      ivaDebito: Number(ivaDebito.toFixed(2)),
      ivaCredito: Number(ivaCredito.toFixed(2)),
      ivaNeto,
      estadoIva,
    };
  }

  async obtenerResumen(dto: ConsultarPeriodoFinancieroDto) {
    const { fromDate, toDate } = this.getDateBounds(dto.periodo, dto.from, dto.to);

    const rows = await this.movimientoRepo
      .createQueryBuilder('mov')
      .select('mov.tipo', 'tipo')
      .addSelect('mov.origen_tipo', 'origenTipo')
      .addSelect('COALESCE(SUM(mov.monto::numeric), 0)', 'total')
      .where('mov.estado = :estado', { estado: MovimientoFinancieroEstado.ACTIVO })
      .andWhere('DATE(mov.fecha_movimiento AT TIME ZONE :tz) BETWEEN :fromDate AND :toDate', {
        tz: this.businessTimeZone,
        fromDate,
        toDate,
      })
      .groupBy('mov.tipo')
      .addGroupBy('mov.origen_tipo')
      .getRawMany<{ tipo: MovimientoFinancieroTipo; origenTipo: MovimientoFinancieroOrigenTipo; total: string }>();

    const ingresosPorOrigen: Record<string, number> = {
      VENTA_POS: 0,
      VENTA_ALOJAMIENTO: 0,
      EXTERNO_MANUAL: 0,
    };

    const egresosPorOrigen: Record<string, number> = {
      EGRESO_MANUAL: 0,
      INVENTARIO_INGRESO: 0,
      RRHH_PAGO: 0,
    };

    for (const row of rows) {
      const total = Number(row.total ?? 0);
      if (row.tipo === MovimientoFinancieroTipo.INGRESO) {
        ingresosPorOrigen[row.origenTipo] = Number(((ingresosPorOrigen[row.origenTipo] ?? 0) + total).toFixed(2));
      } else {
        egresosPorOrigen[row.origenTipo] = Number(((egresosPorOrigen[row.origenTipo] ?? 0) + total).toFixed(2));
      }
    }

    const ingresosTotales = Number(
      Object.values(ingresosPorOrigen)
        .reduce((acc, current) => acc + current, 0)
        .toFixed(2),
    );
    const egresosTotales = Number(
      Object.values(egresosPorOrigen)
        .reduce((acc, current) => acc + current, 0)
        .toFixed(2),
    );

    const resultadoPeriodo = Number((ingresosTotales - egresosTotales).toFixed(2));
    const iva = await this.obtenerIva({ from: fromDate, to: toDate });

    return {
      periodo: { from: fromDate, to: toDate, timeZone: this.businessTimeZone },
      ingresosTotales,
      ingresosPorOrigen,
      egresosTotales,
      egresosPorOrigen,
      resultadoPeriodo,
      iva,
    };
  }

  private async registrarAutomatico(args: RegistroAutomaticoInput, manager?: EntityManager) {
    this.assertMontoValido(args.monto);
    if (!args.origenId?.trim()) {
      throw new BadRequestException('origenId es requerido para registro automático');
    }

    const repo = this.getRepository(manager);
    const payload = {
      tipo: args.tipo,
      origenTipo: args.origenTipo,
      origenId: args.origenId,
      monto: args.monto.toFixed(2),
      moneda: 'CLP',
      categoria: this.normalizeCategoria(args.categoria),
      descripcion: args.descripcion?.trim() || null,
      metodoPago: args.metodoPago || null,
      referencia: args.referencia || null,
      fechaMovimiento: args.fechaMovimiento,
      aplicaCreditoFiscal: args.aplicaCreditoFiscal ?? null,
      ivaTasa: '0.1900',
      metadata: args.metadata ?? null,
      estado: MovimientoFinancieroEstado.ACTIVO,
    };

    await repo
      .createQueryBuilder()
      .insert()
      .into(MovimientoFinancieroEntity)
      .values(payload as any)
      .orIgnore()
      .execute();
  }

  async registrarIngresoVentaPos(
    data: {
      ventaId: number;
      monto: number;
      fechaConfirmacion: Date;
      medioPago?: string | null;
    },
    manager?: EntityManager,
  ) {
    return this.registrarAutomatico(
      {
        tipo: MovimientoFinancieroTipo.INGRESO,
        origenTipo: MovimientoFinancieroOrigenTipo.VENTA_POS,
        origenId: String(data.ventaId),
        monto: data.monto,
        categoria: 'VENTA_POS',
        descripcion: `Ingreso interno por venta POS #${data.ventaId}`,
        fechaMovimiento: data.fechaConfirmacion,
        metodoPago: (data.medioPago as MovimientoFinancieroMetodoPago | null) ?? null,
        referencia: `venta:${data.ventaId}`,
        aplicaCreditoFiscal: true,
        metadata: { ventaId: data.ventaId },
      },
      manager,
    );
  }

  async registrarIngresoVentaAlojamiento(
    data: {
      ventaAlojamientoId: number;
      monto: number;
      fechaConfirmacion: Date;
      medioPago?: string | null;
      asignacionId?: string | null;
    },
    manager?: EntityManager,
  ) {
    return this.registrarAutomatico(
      {
        tipo: MovimientoFinancieroTipo.INGRESO,
        origenTipo: MovimientoFinancieroOrigenTipo.VENTA_ALOJAMIENTO,
        origenId: String(data.ventaAlojamientoId),
        monto: data.monto,
        categoria: 'VENTA_ALOJAMIENTO',
        descripcion: `Ingreso interno por venta alojamiento #${data.ventaAlojamientoId}`,
        fechaMovimiento: data.fechaConfirmacion,
        metodoPago: (data.medioPago as MovimientoFinancieroMetodoPago | null) ?? null,
        referencia: `venta-alojamiento:${data.ventaAlojamientoId}`,
        aplicaCreditoFiscal: true,
        metadata: {
          ventaAlojamientoId: data.ventaAlojamientoId,
          asignacionId: data.asignacionId ?? null,
        },
      },
      manager,
    );
  }

  async registrarEgresoInventarioIngreso(
    data: {
      movimientoAlteraId: number;
      cantidad: number;
      costoIngresoUnitarioTotal: number;
      fecha: Date;
      aplicaCreditoFiscal: boolean;
      documentoRef?: string | null;
      productoId?: string | null;
      productoNombre?: string | null;
    },
    manager?: EntityManager,
  ) {
    const monto = Number((data.cantidad * data.costoIngresoUnitarioTotal).toFixed(2));

    return this.registrarAutomatico(
      {
        tipo: MovimientoFinancieroTipo.EGRESO,
        origenTipo: MovimientoFinancieroOrigenTipo.INVENTARIO_INGRESO,
        origenId: String(data.movimientoAlteraId),
        monto,
        categoria: 'INVENTARIO_INGRESO',
        descripcion: `Egreso automático por ingreso de inventario #${data.movimientoAlteraId}`,
        fechaMovimiento: data.fecha,
        referencia: data.documentoRef ?? `altera:${data.movimientoAlteraId}`,
        aplicaCreditoFiscal: data.aplicaCreditoFiscal,
        metadata: {
          movimientoAlteraId: data.movimientoAlteraId,
          cantidad: data.cantidad,
          costoIngresoUnitarioTotal: data.costoIngresoUnitarioTotal,
          documentoRef: data.documentoRef ?? null,
          productoId: data.productoId ?? null,
          productoNombre: data.productoNombre ?? null,
        },
      },
      manager,
    );
  }
}
