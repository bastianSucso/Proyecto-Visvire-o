import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateIngresoExternoDto } from './dto/create-ingreso-externo.dto';
import { CreateEgresoManualDto } from './dto/create-egreso-manual.dto';
import { ListarMovimientosFinancierosDto } from './dto/listar-movimientos-financieros.dto';
import { ListarHistoricoDiarioDto } from './dto/listar-historico-diario.dto';
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
import { MedioPago, VentaEntity, VentaEstado } from '../ventas/entities/venta.entity';
import {
  VentaAlojamientoEntity,
  VentaAlojamientoEstado,
} from '../alojamiento/entities/venta-alojamiento.entity';
import { SesionCajaEntity, SesionCajaEstado } from '../historial/entities/sesion-caja.entity';

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

type UpsertPagoRrhhInput = {
  pagoId: string;
  monto: number;
  fechaPago: Date;
  concepto: string;
  descripcion?: string | null;
  metodoPago?: MovimientoFinancieroMetodoPago | null;
  referencia?: string | null;
  trabajadorId: string;
  trabajadorNombre?: string | null;
};

@Injectable()
export class FinanzasService {
  private readonly businessTimeZone = 'America/Santiago';

  constructor(
    @InjectRepository(MovimientoFinancieroEntity)
    private readonly movimientoRepo: Repository<MovimientoFinancieroEntity>,
    @InjectRepository(VentaEntity)
    private readonly ventaRepo: Repository<VentaEntity>,
    @InjectRepository(VentaAlojamientoEntity)
    private readonly ventaAlojamientoRepo: Repository<VentaAlojamientoEntity>,
    @InjectRepository(SesionCajaEntity)
    private readonly sesionRepo: Repository<SesionCajaEntity>,
  ) {}

  private getRepository(manager?: EntityManager) {
    return manager
      ? manager.getRepository(MovimientoFinancieroEntity)
      : this.movimientoRepo;
  }

  private normalizeMoney(value: unknown) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private formatItemCount(value: unknown) {
    const amount = this.normalizeMoney(value);
    if (Number.isInteger(amount)) {
      return `${amount}`;
    }
    return amount.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  }

  private normalizeDateKey(value: string) {
    const dateKey = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new BadRequestException('fecha inválida. Usa formato YYYY-MM-DD');
    }

    const [year, month, day] = dateKey.split('-').map((it) => Number(it));
    const test = new Date(Date.UTC(year, month - 1, day));
    const valid =
      test.getUTCFullYear() === year &&
      test.getUTCMonth() + 1 === month &&
      test.getUTCDate() === day;

    if (!valid) {
      throw new BadRequestException('fecha inválida. Usa formato YYYY-MM-DD');
    }

    return dateKey;
  }

  private normalizePage(page?: number) {
    if (!Number.isFinite(page ?? 1)) return 1;
    return Math.max(1, Number(page ?? 1));
  }

  private normalizePageSize(pageSize?: number) {
    if (!Number.isFinite(pageSize ?? 20)) return 20;
    return Math.min(100, Math.max(1, Number(pageSize ?? 20)));
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

  async listarHistoricoDiario(dto: ListarHistoricoDiarioDto) {
    const page = this.normalizePage(dto.page);
    const pageSize = this.normalizePageSize(dto.pageSize);
    const fecha = dto.fecha ? this.normalizeDateKey(dto.fecha) : null;
    const offset = (page - 1) * pageSize;

    const totalQb = this.sesionRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT TO_CHAR(s.fecha_apertura AT TIME ZONE :tz, \'YYYY-MM-DD\'))', 'totalItems')
      .setParameters({ tz: this.businessTimeZone });

    if (fecha) {
      totalQb.andWhere('DATE(s.fecha_apertura AT TIME ZONE :tz) = :fecha', { fecha });
    }

    const totalRow = await totalQb.getRawOne<{ totalItems: string }>();
    const totalItems = Number(totalRow?.totalItems ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const fechaAperturaExpr = `TO_CHAR(s.fecha_apertura AT TIME ZONE :tz, 'YYYY-MM-DD')`;

    const fechasQb = this.sesionRepo
      .createQueryBuilder('s')
      .select(fechaAperturaExpr, 'fecha')
      .setParameters({ tz: this.businessTimeZone })
      .groupBy(fechaAperturaExpr)
      .orderBy('fecha', 'DESC')
      .offset(offset)
      .limit(pageSize);

    if (fecha) {
      fechasQb.andWhere('DATE(s.fecha_apertura AT TIME ZONE :tz) = :fecha', { fecha });
    }

    const fechasRows = await fechasQb.getRawMany<{ fecha: string }>();
    const fechas = fechasRows.map((row) => row.fecha);

    if (fechas.length === 0) {
      return {
        items: [],
        meta: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
      };
    }

    const posRows = await this.sesionRepo
      .createQueryBuilder('s')
      .innerJoin(VentaEntity, 'v', 'v.id_sesioncaja = s.id_sesion_caja')
      .select(fechaAperturaExpr, 'fecha')
      .addSelect('COALESCE(SUM(v.total_venta::numeric), 0)', 'totalVentas')
      .addSelect('COUNT(v.id_venta)', 'cantidadVentas')
      .addSelect(
        'COALESCE(SUM(CASE WHEN v.medio_pago = :efectivo THEN v.total_venta::numeric ELSE 0 END), 0)',
        'totalEfectivo',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN v.medio_pago = :tarjeta THEN v.total_venta::numeric ELSE 0 END), 0)',
        'totalTarjeta',
      )
      .addSelect(
        'COALESCE(SUM(COALESCE(v.ganancia_bruta_snapshot::numeric, 0)), 0)',
        'gananciaBruta',
      )
      .where('v.estado = :estadoVenta', { estadoVenta: VentaEstado.CONFIRMADA })
      .andWhere('TO_CHAR(s.fecha_apertura AT TIME ZONE :tz, \'YYYY-MM-DD\') IN (:...fechas)', {
        fechas,
        tz: this.businessTimeZone,
        efectivo: MedioPago.EFECTIVO,
        tarjeta: MedioPago.TARJETA,
      })
      .groupBy(fechaAperturaExpr)
      .getRawMany<{
        fecha: string;
        totalVentas: string;
        cantidadVentas: string;
        totalEfectivo: string;
        totalTarjeta: string;
        gananciaBruta: string;
      }>();

    const alojamientoRows = await this.sesionRepo
      .createQueryBuilder('s')
      .innerJoin(VentaAlojamientoEntity, 'va', 'va.id_sesion_caja = s.id_sesion_caja')
      .select(fechaAperturaExpr, 'fecha')
      .addSelect('COALESCE(SUM(va.monto_total::numeric), 0)', 'totalVentas')
      .addSelect('COUNT(va.id_venta_alojamiento)', 'cantidadVentas')
      .addSelect(
        'COALESCE(SUM(CASE WHEN va.medio_pago = :efectivo THEN va.monto_total::numeric ELSE 0 END), 0)',
        'totalEfectivo',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN va.medio_pago = :tarjeta THEN va.monto_total::numeric ELSE 0 END), 0)',
        'totalTarjeta',
      )
      .addSelect(
        'COALESCE(SUM(COALESCE(va.ganancia_bruta_snapshot::numeric, 0)), 0)',
        'gananciaBruta',
      )
      .where('va.estado = :estadoVenta', {
        estadoVenta: VentaAlojamientoEstado.CONFIRMADA,
      })
      .andWhere('TO_CHAR(s.fecha_apertura AT TIME ZONE :tz, \'YYYY-MM-DD\') IN (:...fechas)', {
        fechas,
        tz: this.businessTimeZone,
        efectivo: MedioPago.EFECTIVO,
        tarjeta: MedioPago.TARJETA,
      })
      .groupBy(fechaAperturaExpr)
      .getRawMany<{
        fecha: string;
        totalVentas: string;
        cantidadVentas: string;
        totalEfectivo: string;
        totalTarjeta: string;
        gananciaBruta: string;
      }>();

    const jornadasRows = await this.sesionRepo
      .createQueryBuilder('s')
      .select(fechaAperturaExpr, 'fecha')
      .addSelect('COUNT(s.id_sesion_caja)', 'cantidadJornadas')
      .addSelect('MIN(s.fecha_apertura)', 'primeraApertura')
      .addSelect('MAX(s.fecha_cierre)', 'ultimoCierre')
      .where('TO_CHAR(s.fecha_apertura AT TIME ZONE :tz, \'YYYY-MM-DD\') IN (:...fechas)', {
        fechas,
        tz: this.businessTimeZone,
      })
      .groupBy(fechaAperturaExpr)
      .getRawMany<{
        fecha: string;
        cantidadJornadas: string;
        primeraApertura: Date;
        ultimoCierre: Date | null;
      }>();

    const acumulado = new Map<
      string,
      {
        fecha: string;
        totalVentas: number;
        cantidadVentas: number;
        gananciaBruta: number;
        cantidadJornadas: number;
        totalEfectivo: number;
        totalTarjeta: number;
        primeraApertura: Date | null;
        ultimoCierre: Date | null;
      }
    >();
    for (const fechaItem of fechas) {
      acumulado.set(fechaItem, {
        fecha: fechaItem,
        totalVentas: 0,
        cantidadVentas: 0,
        gananciaBruta: 0,
        cantidadJornadas: 0,
        totalEfectivo: 0,
        totalTarjeta: 0,
        primeraApertura: null,
        ultimoCierre: null,
      });
    }

    for (const row of posRows) {
      const current = acumulado.get(row.fecha);
      if (!current) continue;
      current.totalVentas += this.normalizeMoney(row.totalVentas);
      current.cantidadVentas += Number(row.cantidadVentas ?? 0);
      current.totalEfectivo += this.normalizeMoney(row.totalEfectivo);
      current.totalTarjeta += this.normalizeMoney(row.totalTarjeta);
      current.gananciaBruta += this.normalizeMoney(row.gananciaBruta);
    }

    for (const row of alojamientoRows) {
      const current = acumulado.get(row.fecha);
      if (!current) continue;
      current.totalVentas += this.normalizeMoney(row.totalVentas);
      current.cantidadVentas += Number(row.cantidadVentas ?? 0);
      current.totalEfectivo += this.normalizeMoney(row.totalEfectivo);
      current.totalTarjeta += this.normalizeMoney(row.totalTarjeta);
      current.gananciaBruta += this.normalizeMoney(row.gananciaBruta);
    }

    for (const row of jornadasRows) {
      const current = acumulado.get(row.fecha);
      if (!current) continue;
      current.cantidadJornadas = Number(row.cantidadJornadas ?? 0);
      current.primeraApertura = row.primeraApertura ? new Date(row.primeraApertura) : null;
      current.ultimoCierre = row.ultimoCierre ? new Date(row.ultimoCierre) : null;
    }

    const items = fechas.map((fechaItem) => {
      const row = acumulado.get(fechaItem)!;
      return {
        fecha: row.fecha,
        totalVentas: Number(row.totalVentas.toFixed(2)),
        cantidadVentas: row.cantidadVentas,
        gananciaBruta: Number(row.gananciaBruta.toFixed(2)),
        cantidadJornadas: row.cantidadJornadas,
        totalEfectivo: Number(row.totalEfectivo.toFixed(2)),
        totalTarjeta: Number(row.totalTarjeta.toFixed(2)),
        primeraApertura: row.primeraApertura,
        ultimoCierre: row.ultimoCierre,
      };
    });

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async obtenerDetalleHistoricoDia(rawFecha: string) {
    const fecha = this.normalizeDateKey(rawFecha);

    const sesiones = await this.sesionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.usuario', 'u')
      .where('DATE(s.fecha_apertura AT TIME ZONE :tz) = :fecha', {
        tz: this.businessTimeZone,
        fecha,
      })
      .orderBy('s.fecha_apertura', 'DESC')
      .getMany();

    if (sesiones.length === 0) {
      return {
        fecha,
        resumenDia: {
          cantidadJornadas: 0,
          totalVentas: 0,
          cantidadVentas: 0,
          gananciaBruta: 0,
          totalEfectivo: 0,
          totalTarjeta: 0,
        },
        jornadas: [],
      };
    }

    const sesionIds = sesiones.map((s) => s.id);

    const posStats = await this.ventaRepo
      .createQueryBuilder('v')
      .select('v.id_sesioncaja', 'sesionId')
      .addSelect('COALESCE(SUM(v.total_venta::numeric), 0)', 'totalVentas')
      .addSelect('COUNT(v.id_venta)', 'cantidadVentas')
      .addSelect(
        'COALESCE(SUM(CASE WHEN v.medio_pago = :efectivo THEN v.total_venta::numeric ELSE 0 END), 0)',
        'totalEfectivo',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN v.medio_pago = :tarjeta THEN v.total_venta::numeric ELSE 0 END), 0)',
        'totalTarjeta',
      )
      .addSelect(
        'COALESCE(SUM(COALESCE(v.ganancia_bruta_snapshot::numeric, 0)), 0)',
        'gananciaBruta',
      )
      .where('v.estado = :estado', { estado: VentaEstado.CONFIRMADA })
      .andWhere('v.id_sesioncaja IN (:...sesionIds)', { sesionIds })
      .setParameters({ efectivo: MedioPago.EFECTIVO, tarjeta: MedioPago.TARJETA })
      .groupBy('v.id_sesioncaja')
      .getRawMany<{
        sesionId: string;
        totalVentas: string;
        cantidadVentas: string;
        totalEfectivo: string;
        totalTarjeta: string;
        gananciaBruta: string;
      }>();

    const alojStats = await this.ventaAlojamientoRepo
      .createQueryBuilder('va')
      .select('va.id_sesion_caja', 'sesionId')
      .addSelect('COALESCE(SUM(va.monto_total::numeric), 0)', 'totalVentas')
      .addSelect('COUNT(va.id_venta_alojamiento)', 'cantidadVentas')
      .addSelect(
        'COALESCE(SUM(CASE WHEN va.medio_pago = :efectivo THEN va.monto_total::numeric ELSE 0 END), 0)',
        'totalEfectivo',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN va.medio_pago = :tarjeta THEN va.monto_total::numeric ELSE 0 END), 0)',
        'totalTarjeta',
      )
      .addSelect(
        'COALESCE(SUM(COALESCE(va.ganancia_bruta_snapshot::numeric, 0)), 0)',
        'gananciaBruta',
      )
      .where('va.estado = :estado', { estado: VentaAlojamientoEstado.CONFIRMADA })
      .andWhere('va.id_sesion_caja IN (:...sesionIds)', { sesionIds })
      .setParameters({ efectivo: MedioPago.EFECTIVO, tarjeta: MedioPago.TARJETA })
      .groupBy('va.id_sesion_caja')
      .getRawMany<{
        sesionId: string;
        totalVentas: string;
        cantidadVentas: string;
        totalEfectivo: string;
        totalTarjeta: string;
        gananciaBruta: string;
      }>();

    const posVentas = await this.ventaRepo
      .createQueryBuilder('v')
      .select('v.id_sesioncaja', 'sesionId')
      .addSelect('v.id_venta', 'ventaId')
      .addSelect('v.fecha_confirmacion', 'fechaVenta')
      .addSelect('v.medio_pago', 'medioPago')
      .addSelect('v.total_venta::numeric', 'montoTotal')
      .addSelect('COALESCE(SUM(vi.cantidad::numeric), 0)', 'cantidadItems')
      .where('v.estado = :estado', { estado: VentaEstado.CONFIRMADA })
      .leftJoin('venta_item', 'vi', 'vi.id_venta = v.id_venta')
      .andWhere('v.id_sesioncaja IN (:...sesionIds)', { sesionIds })
      .groupBy('v.id_sesioncaja')
      .addGroupBy('v.id_venta')
      .addGroupBy('v.fecha_confirmacion')
      .addGroupBy('v.medio_pago')
      .addGroupBy('v.total_venta')
      .orderBy('v.fecha_confirmacion', 'DESC')
      .getRawMany<{
        sesionId: string;
        ventaId: string;
        fechaVenta: Date;
        medioPago: 'EFECTIVO' | 'TARJETA' | null;
        montoTotal: string;
        cantidadItems: string;
      }>();

    const alojVentas = await this.ventaAlojamientoRepo
      .createQueryBuilder('va')
      .select('va.id_sesion_caja', 'sesionId')
      .addSelect('va.id_venta_alojamiento', 'ventaId')
      .addSelect('va.fecha_confirmacion', 'fechaVenta')
      .addSelect('va.medio_pago', 'medioPago')
      .addSelect('asig.id', 'asignacionId')
      .addSelect('hab.identificador', 'habitacionIdentificador')
      .addSelect('h.nombre_completo', 'huespedNombre')
      .addSelect('va.monto_total::numeric', 'montoTotal')
      .where('va.estado = :estado', { estado: VentaAlojamientoEstado.CONFIRMADA })
      .leftJoin('va.asignacion', 'asig')
      .leftJoin('asig.habitacion', 'hab')
      .leftJoin('asig.huesped', 'h')
      .andWhere('va.id_sesion_caja IN (:...sesionIds)', { sesionIds })
      .orderBy('va.fecha_confirmacion', 'DESC')
      .getRawMany<{
        sesionId: string;
        ventaId: string;
        fechaVenta: Date;
        medioPago: 'EFECTIVO' | 'TARJETA' | null;
        asignacionId: string | null;
        habitacionIdentificador: string | null;
        huespedNombre: string | null;
        montoTotal: string;
      }>();

    const statsBySesion = new Map<
      number,
      {
        totalVentas: number;
        cantidadVentas: number;
        totalEfectivo: number;
        totalTarjeta: number;
        gananciaBruta: number;
      }
    >();
    for (const id of sesionIds) {
      statsBySesion.set(id, {
        totalVentas: 0,
        cantidadVentas: 0,
        totalEfectivo: 0,
        totalTarjeta: 0,
        gananciaBruta: 0,
      });
    }

    for (const row of posStats) {
      const sesionId = Number(row.sesionId);
      const current = statsBySesion.get(sesionId);
      if (!current) continue;
      current.totalVentas += this.normalizeMoney(row.totalVentas);
      current.cantidadVentas += Number(row.cantidadVentas ?? 0);
      current.totalEfectivo += this.normalizeMoney(row.totalEfectivo);
      current.totalTarjeta += this.normalizeMoney(row.totalTarjeta);
      current.gananciaBruta += this.normalizeMoney(row.gananciaBruta);
    }

    for (const row of alojStats) {
      const sesionId = Number(row.sesionId);
      const current = statsBySesion.get(sesionId);
      if (!current) continue;
      current.totalVentas += this.normalizeMoney(row.totalVentas);
      current.cantidadVentas += Number(row.cantidadVentas ?? 0);
      current.totalEfectivo += this.normalizeMoney(row.totalEfectivo);
      current.totalTarjeta += this.normalizeMoney(row.totalTarjeta);
      current.gananciaBruta += this.normalizeMoney(row.gananciaBruta);
    }

    const ventasBySesion = new Map<
      number,
      Array<{
        ventaId: number;
        tipo: 'VENTA_POS' | 'VENTA_ALOJAMIENTO';
        fechaVenta: Date;
        montoTotal: number;
        medioPago: 'EFECTIVO' | 'TARJETA' | null;
        detalle: string;
        asignacionId: string | null;
      }>
    >();
    for (const id of sesionIds) ventasBySesion.set(id, []);

    for (const row of posVentas) {
      const sesionId = Number(row.sesionId);
      const list = ventasBySesion.get(sesionId);
      if (!list) continue;
      list.push({
        ventaId: Number(row.ventaId),
        tipo: 'VENTA_POS',
        fechaVenta: row.fechaVenta,
        montoTotal: this.normalizeMoney(row.montoTotal),
        medioPago: row.medioPago,
        detalle: `${this.formatItemCount(row.cantidadItems)} item(s)`,
        asignacionId: null,
      });
    }

    for (const row of alojVentas) {
      const sesionId = Number(row.sesionId);
      const list = ventasBySesion.get(sesionId);
      if (!list) continue;
      list.push({
        ventaId: Number(row.ventaId),
        tipo: 'VENTA_ALOJAMIENTO',
        fechaVenta: row.fechaVenta,
        montoTotal: this.normalizeMoney(row.montoTotal),
        medioPago: row.medioPago,
        detalle: `${row.habitacionIdentificador ?? '-'} · ${row.huespedNombre ?? 'Huesped'}`,
        asignacionId: row.asignacionId,
      });
    }

    let totalVentasDia = 0;
    let cantidadVentasDia = 0;
    let gananciaBrutaDia = 0;
    let totalEfectivoDia = 0;
    let totalTarjetaDia = 0;

    const jornadas = sesiones.map((sesion) => {
      const stats = statsBySesion.get(sesion.id) ?? {
        totalVentas: 0,
        cantidadVentas: 0,
        totalEfectivo: 0,
        totalTarjeta: 0,
        gananciaBruta: 0,
      };
      const ventas = (ventasBySesion.get(sesion.id) ?? []).sort(
        (a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime(),
      );
      const usuario = sesion.usuario;
      const nombre = `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim();
      const montoInicial = this.normalizeMoney(sesion.montoInicial);
      const totalEfectivo = stats.totalEfectivo;
      const totalTarjeta = stats.totalTarjeta;
      const montoFinal =
        sesion.montoFinal === null ? montoInicial + totalEfectivo : this.normalizeMoney(sesion.montoFinal);

      totalVentasDia += stats.totalVentas;
      cantidadVentasDia += stats.cantidadVentas;
      gananciaBrutaDia += stats.gananciaBruta;
      totalEfectivoDia += totalEfectivo;
      totalTarjetaDia += totalTarjeta;

      return {
        sesionCajaId: sesion.id,
        estado: sesion.estado,
        fechaApertura: sesion.fechaApertura,
        fechaCierre: sesion.fechaCierre,
        montoInicial: Number(montoInicial.toFixed(2)),
        montoFinal: Number(montoFinal.toFixed(2)),
        totalEfectivo: Number(totalEfectivo.toFixed(2)),
        totalTarjeta: Number(totalTarjeta.toFixed(2)),
        responsableCierre: {
          idUsuario: usuario?.idUsuario ?? null,
          nombre: nombre || null,
          email: usuario?.email ?? null,
        },
        totalVentas: Number(stats.totalVentas.toFixed(2)),
        cantidadVentas: stats.cantidadVentas,
        gananciaBruta: Number(stats.gananciaBruta.toFixed(2)),
        ventas: ventas.map((venta) => ({
          ventaId: venta.ventaId,
          tipo: venta.tipo,
          fechaVenta: venta.fechaVenta,
          medioPago: venta.medioPago,
          detalle: venta.detalle,
          asignacionId: venta.asignacionId,
          montoTotal: Number(venta.montoTotal.toFixed(2)),
        })),
      };
    });

    return {
      fecha,
      resumenDia: {
        cantidadJornadas: jornadas.length,
        totalVentas: Number(totalVentasDia.toFixed(2)),
        cantidadVentas: cantidadVentasDia,
        gananciaBruta: Number(gananciaBrutaDia.toFixed(2)),
        totalEfectivo: Number(totalEfectivoDia.toFixed(2)),
        totalTarjeta: Number(totalTarjetaDia.toFixed(2)),
      },
      jornadas,
    };
  }

  async obtenerDetalleVentaPosAdmin(idVenta: number) {
    if (!Number.isFinite(idVenta) || idVenta <= 0) {
      throw new BadRequestException('idVenta inválido');
    }

    const venta = await this.ventaRepo.findOne({
      where: { idVenta, estado: VentaEstado.CONFIRMADA },
      relations: {
        sesionCaja: { usuario: true, caja: true },
        items: { producto: true },
      },
    });

    if (!venta) {
      throw new NotFoundException('Venta POS no encontrada');
    }

    const items = [...(venta.items ?? [])]
      .sort((a, b) => a.idItem - b.idItem)
      .map((it) => ({
      idItem: it.idItem,
      productoId: (it.producto as any)?.id ?? null,
      nombreProducto: (it.producto as any)?.name ?? null,
      unidadProducto: (it.producto as any)?.unidadBase ?? null,
      cantidad: this.normalizeMoney(it.cantidad),
      precioUnitario: this.normalizeMoney(it.precioUnitario),
      subtotal: this.normalizeMoney(it.subtotal),
      costoUnitarioSnapshot: this.normalizeMoney(it.costoUnitarioSnapshot),
      cogsSnapshot: this.normalizeMoney(it.cogsSnapshot),
      }));

    const sesion = venta.sesionCaja;
    const usuario = (sesion as any)?.usuario;

    return {
      tipo: 'VENTA_POS',
      venta: {
        idVenta: venta.idVenta,
        estado: venta.estado,
        fechaCreacion: venta.fechaCreacion,
        fechaConfirmacion: venta.fechaConfirmacion,
        medioPago: venta.medioPago,
        totalVenta: this.normalizeMoney(venta.totalVenta),
        cantidadTotal: this.normalizeMoney(venta.cantidadTotal),
        cogsTotalSnapshot: this.normalizeMoney(venta.cogsTotalSnapshot),
        gananciaBrutaSnapshot: this.normalizeMoney(venta.gananciaBrutaSnapshot),
      },
      sesion: {
        idSesionCaja: sesion?.id ?? null,
        fechaApertura: sesion?.fechaApertura ?? null,
        fechaCierre: sesion?.fechaCierre ?? null,
        cajaNumero: (sesion as any)?.caja?.numero ?? null,
        responsable: {
          idUsuario: usuario?.idUsuario ?? null,
          nombre: `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim() || null,
          email: usuario?.email ?? null,
        },
      },
      items,
    };
  }

  async obtenerDetalleVentaAlojamientoAdmin(idVentaAlojamiento: number) {
    if (!Number.isFinite(idVentaAlojamiento) || idVentaAlojamiento <= 0) {
      throw new BadRequestException('idVentaAlojamiento inválido');
    }

    const venta = await this.ventaAlojamientoRepo.findOne({
      where: {
        id: idVentaAlojamiento,
        estado: VentaAlojamientoEstado.CONFIRMADA,
      },
      relations: {
        sesionCaja: { usuario: true, caja: true },
        asignacion: {
          habitacion: { pisoZona: true },
          huesped: { empresaHostal: true },
        },
      },
    });

    if (!venta) {
      throw new NotFoundException('Venta de alojamiento no encontrada');
    }

    const sesion = venta.sesionCaja;
    const usuario = (sesion as any)?.usuario;
    const asignacion = venta.asignacion;
    const huesped = asignacion?.huesped as any;
    const habitacion = asignacion?.habitacion as any;

    return {
      tipo: 'VENTA_ALOJAMIENTO',
      venta: {
        idVentaAlojamiento: venta.id,
        fechaConfirmacion: venta.fechaConfirmacion,
        medioPago: venta.medioPago,
        montoTotal: this.normalizeMoney(venta.montoTotal),
        cogsTotalSnapshot: this.normalizeMoney(venta.cogsTotalSnapshot),
        gananciaBrutaSnapshot: this.normalizeMoney(venta.gananciaBrutaSnapshot),
      },
      sesion: {
        idSesionCaja: sesion?.id ?? null,
        fechaApertura: sesion?.fechaApertura ?? null,
        fechaCierre: sesion?.fechaCierre ?? null,
        cajaNumero: (sesion as any)?.caja?.numero ?? null,
        responsable: {
          idUsuario: usuario?.idUsuario ?? null,
          nombre: `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim() || null,
          email: usuario?.email ?? null,
        },
      },
      asignacion: {
        id: asignacion?.id ?? null,
        estado: asignacion?.estado ?? null,
        tipoCobro: asignacion?.tipoCobro ?? null,
        noches: asignacion?.noches ?? 0,
        fechaIngreso: asignacion?.fechaIngreso ?? null,
        fechaSalidaEstimada: asignacion?.fechaSalidaEstimada ?? null,
        fechaSalidaReal: asignacion?.fechaSalidaReal ?? null,
      },
      habitacion: {
        id: habitacion?.id ?? null,
        identificador: habitacion?.identificador ?? null,
        pisoNombre: habitacion?.pisoZona?.nombre ?? null,
      },
      huesped: {
        id: huesped?.id ?? null,
        nombreCompleto: huesped?.nombreCompleto ?? null,
        rut: huesped?.rut ?? null,
        correo: huesped?.correo ?? null,
        telefono: huesped?.telefono ?? null,
        empresaNombre: huesped?.empresaHostal?.nombreEmpresa ?? null,
      },
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

  async upsertEgresoRrhhPago(data: UpsertPagoRrhhInput, manager?: EntityManager) {
    this.assertMontoValido(data.monto);
    const pagoId = data.pagoId?.trim();
    if (!pagoId) {
      throw new BadRequestException('pagoId es requerido para consolidar RRHH');
    }

    const repo = this.getRepository(manager);

    const payload: Partial<MovimientoFinancieroEntity> = {
      tipo: MovimientoFinancieroTipo.EGRESO,
      origenTipo: MovimientoFinancieroOrigenTipo.RRHH_PAGO,
      origenId: pagoId,
      monto: data.monto.toFixed(2),
      moneda: 'CLP',
      categoria: 'RRHH_PAGO',
      descripcion: data.descripcion?.trim() || `Pago RRHH (${data.concepto.trim().toUpperCase()})`,
      metodoPago: data.metodoPago ?? null,
      referencia: data.referencia?.trim() || `rrhh-pago:${pagoId}`,
      fechaMovimiento: data.fechaPago,
      aplicaCreditoFiscal: false,
      ivaTasa: '0.1900',
      metadata: {
        pagoId,
        concepto: data.concepto.trim().toUpperCase(),
        trabajadorId: data.trabajadorId,
        trabajadorNombre: data.trabajadorNombre ?? null,
      },
      estado: MovimientoFinancieroEstado.ACTIVO,
    };

    const existing = await repo.findOne({
      where: {
        origenTipo: MovimientoFinancieroOrigenTipo.RRHH_PAGO,
        origenId: pagoId,
      },
    });

    if (existing) {
      Object.assign(existing, payload);
      await repo.save(existing);
      return;
    }

    const mov = repo.create(payload as MovimientoFinancieroEntity);
    await repo.save(mov);
  }

  async anularMovimientoRrhhPago(
    pagoId: string,
    userId: string,
    motivo?: string | null,
    manager?: EntityManager,
  ) {
    const normalizedPagoId = pagoId?.trim();
    if (!normalizedPagoId) return;

    const repo = this.getRepository(manager);
    const mov = await repo.findOne({
      where: {
        origenTipo: MovimientoFinancieroOrigenTipo.RRHH_PAGO,
        origenId: normalizedPagoId,
      },
    });

    if (!mov || mov.estado === MovimientoFinancieroEstado.ANULADO) {
      return;
    }

    mov.estado = MovimientoFinancieroEstado.ANULADO;
    mov.anuladoAt = new Date();
    mov.anuladoBy = { idUsuario: userId } as any;
    mov.anuladoMotivo = motivo?.trim() || null;
    await repo.save(mov);
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
