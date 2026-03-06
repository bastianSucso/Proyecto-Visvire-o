import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { VentaEntity, VentaEstado } from '../ventas/entities/venta.entity';
import { VentaItemEntity } from '../ventas/entities/venta-item.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import {
  VentaAlojamientoEntity,
  VentaAlojamientoEstado,
} from '../alojamiento/entities/venta-alojamiento.entity';
import { SesionCajaEntity } from '../historial/entities/sesion-caja.entity';
import { HabitacionEntity } from '../alojamiento/entities/habitacion.entity';
import {
  AsignacionEstado,
  AsignacionHabitacionEntity,
} from '../alojamiento/entities/asignacion-habitacion.entity';

type EstadoCajaDashboard = 'ABIERTA' | 'CERRADA' | 'SIN_JORNADA';

@Injectable()
export class DashboardService {
  private readonly businessTimeZone = 'America/Santiago';

  constructor(
    @InjectRepository(VentaEntity)
    private readonly ventaRepo: Repository<VentaEntity>,
    @InjectRepository(VentaItemEntity)
    private readonly ventaItemRepo: Repository<VentaItemEntity>,
    @InjectRepository(VentaAlojamientoEntity)
    private readonly ventaAlojamientoRepo: Repository<VentaAlojamientoEntity>,
    @InjectRepository(SesionCajaEntity)
    private readonly sesionRepo: Repository<SesionCajaEntity>,
    @InjectRepository(HabitacionEntity)
    private readonly habitacionRepo: Repository<HabitacionEntity>,
    @InjectRepository(AsignacionHabitacionEntity)
    private readonly asignacionRepo: Repository<AsignacionHabitacionEntity>,
  ) {}

  async getOperativoHoy(diasSerie: 7 | 30 = 7) {
    const [ventasPos, ventasAlojamiento, estadoCaja, ocupacion, ventasPorDia] =
      await Promise.all([
        this.getVentasPosHoy(),
        this.getVentasAlojamientoHoy(),
        this.getEstadoCajaHoy(),
        this.getOcupacionActual(),
        this.getVentasPorDia(diasSerie),
      ]);

    const totalVentasDia =
      ventasPos.totalVentas + ventasAlojamiento.totalVentas;
    const cantidadVentasDia =
      ventasPos.cantidadVentas + ventasAlojamiento.cantidadVentas;
    const cogsPosDia = ventasPos.cogsPos;
    const cogsAlojamientoDia = 0;
    const gananciaBrutaDia = totalVentasDia - cogsPosDia - cogsAlojamientoDia;

    return {
      fechaNegocio: this.getBusinessDateKey(new Date()),
      timeZone: this.businessTimeZone,
      totalVentasDia: totalVentasDia.toFixed(2),
      cantidadVentasDia,
      gananciaBrutaDia: gananciaBrutaDia.toFixed(2),
      costoProductosVendidosDia: cogsPosDia.toFixed(2),
      costoAlojamientoDia: cogsAlojamientoDia.toFixed(2),
      estadoCaja,
      ocupacion,
      ventasPorDia,
      periodoVentasDias: diasSerie,
      notaCogs:
        'COGS de alojamiento asumido en 0 por definición de negocio vigente.',
    };
  }

  private getBusinessDateFilter(columnSql: string) {
    return `DATE(${columnSql} AT TIME ZONE :tz) = DATE(NOW() AT TIME ZONE :tz)`;
  }

  private getBusinessDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat('es-CL', {
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

  private async getVentasPosHoy() {
    const rowVentas = await this.ventaRepo
      .createQueryBuilder('v')
      .select('COALESCE(SUM(v.total_venta::numeric), 0)', 'totalVentas')
      .addSelect('COUNT(*)', 'cantidadVentas')
      .where('v.estado = :estado', { estado: VentaEstado.CONFIRMADA })
      .andWhere(this.getBusinessDateFilter('v.fecha_confirmacion'), {
        tz: this.businessTimeZone,
      })
      .getRawOne<{ totalVentas: string; cantidadVentas: string }>();

    const rowCogs = await this.ventaItemRepo
      .createQueryBuilder('it')
      .innerJoin(VentaEntity, 'v', 'v.id_venta = it.id_venta')
      .innerJoin(ProductoEntity, 'p', 'p.id = it.id_producto')
      .select(
        'COALESCE(SUM((it.cantidad::numeric) * (COALESCE("p"."precioCosto", 0)::numeric)), 0)',
        'cogsPos',
      )
      .where('v.estado = :estado', { estado: VentaEstado.CONFIRMADA })
      .andWhere(this.getBusinessDateFilter('v.fecha_confirmacion'), {
        tz: this.businessTimeZone,
      })
      .getRawOne<{ cogsPos: string }>();

    return {
      totalVentas: Number(rowVentas?.totalVentas ?? 0),
      cantidadVentas: Number(rowVentas?.cantidadVentas ?? 0),
      cogsPos: Number(rowCogs?.cogsPos ?? 0),
    };
  }

  private async getVentasAlojamientoHoy() {
    const row = await this.ventaAlojamientoRepo
      .createQueryBuilder('va')
      .select('COALESCE(SUM(va.monto_total::numeric), 0)', 'totalVentas')
      .addSelect('COUNT(*)', 'cantidadVentas')
      .where('va.estado = :estado', {
        estado: VentaAlojamientoEstado.CONFIRMADA,
      })
      .andWhere(this.getBusinessDateFilter('va.fecha_confirmacion'), {
        tz: this.businessTimeZone,
      })
      .getRawOne<{ totalVentas: string; cantidadVentas: string }>();

    return {
      totalVentas: Number(row?.totalVentas ?? 0),
      cantidadVentas: Number(row?.cantidadVentas ?? 0),
    };
  }

  private async getEstadoCajaHoy(): Promise<EstadoCajaDashboard> {
    const sesionesAbiertas = await this.sesionRepo.count({
      where: { fechaCierre: IsNull() },
    });
    if (sesionesAbiertas > 0) return 'ABIERTA';

    const row = await this.sesionRepo
      .createQueryBuilder('s')
      .select('COUNT(*)', 'cantidad')
      .where(this.getBusinessDateFilter('s.fecha_apertura'), {
        tz: this.businessTimeZone,
      })
      .orWhere(this.getBusinessDateFilter('s.fecha_cierre'), {
        tz: this.businessTimeZone,
      })
      .getRawOne<{ cantidad: string }>();

    return Number(row?.cantidad ?? 0) > 0 ? 'CERRADA' : 'SIN_JORNADA';
  }

  private async getOcupacionActual() {
    const habitacionesHabilitadas = await this.habitacionRepo.count({
      where: { estadoActivo: true },
    });

    const ocupadas = await this.asignacionRepo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.habitacion', 'h')
      .innerJoinAndSelect('a.huesped', 'hu')
      .where('h.estado_activo = :activa', { activa: true })
      .andWhere('a.estado = :estado', { estado: AsignacionEstado.ACTIVA })
      .andWhere('a.fecha_ingreso <= NOW()')
      .andWhere(
        'COALESCE(a.fecha_salida_real, a.fecha_salida_estimada) > NOW()',
      )
      .orderBy('h.identificador', 'ASC')
      .getMany();

    const habitacionesOcupadas = ocupadas.length;
    const porcentaje =
      habitacionesHabilitadas > 0
        ? Number(
            ((habitacionesOcupadas / habitacionesHabilitadas) * 100).toFixed(2),
          )
        : 0;

    return {
      porcentaje,
      habitacionesHabilitadas,
      habitacionesOcupadas,
      detalle: ocupadas.map((asignacion) => ({
        habitacionId: asignacion.habitacion.id,
        habitacion: asignacion.habitacion.identificador,
        huespedNombreCompleto: asignacion.huesped.nombreCompleto,
      })),
    };
  }

  private getRecentBusinessDateKeys(days: number) {
    const today = this.getBusinessDateKey(new Date());
    const [yy, mm, dd] = today.split('-').map((value) => Number(value));
    const baseUtc = new Date(Date.UTC(yy, mm - 1, dd, 12, 0, 0));
    const keys: string[] = [];

    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(baseUtc);
      d.setUTCDate(baseUtc.getUTCDate() - i);
      keys.push(d.toISOString().slice(0, 10));
    }

    return keys;
  }

  private async getVentasPorDia(diasSerie: 7 | 30) {
    const fechas = this.getRecentBusinessDateKeys(diasSerie);
    const fechaInicio = fechas[0];
    const fechaPosExpr = `TO_CHAR(v.fecha_confirmacion AT TIME ZONE :tz, 'YYYY-MM-DD')`;
    const fechaAlojExpr = `TO_CHAR(va.fecha_confirmacion AT TIME ZONE :tz, 'YYYY-MM-DD')`;

    const ventasPos = await this.ventaRepo
      .createQueryBuilder('v')
      .select(fechaPosExpr, 'fecha')
      .addSelect('COALESCE(SUM(v.total_venta::numeric), 0)', 'total')
      .where('v.estado = :estado', { estado: VentaEstado.CONFIRMADA })
      .andWhere(
        `DATE(v.fecha_confirmacion AT TIME ZONE :tz) BETWEEN :inicio::date AND DATE(NOW() AT TIME ZONE :tz)`,
        {
          tz: this.businessTimeZone,
          inicio: fechaInicio,
        },
      )
      .groupBy(fechaPosExpr)
      .getRawMany<{ fecha: string; total: string }>();

    const ventasAlojamiento = await this.ventaAlojamientoRepo
      .createQueryBuilder('va')
      .select(fechaAlojExpr, 'fecha')
      .addSelect('COALESCE(SUM(va.monto_total::numeric), 0)', 'total')
      .where('va.estado = :estado', {
        estado: VentaAlojamientoEstado.CONFIRMADA,
      })
      .andWhere(
        `DATE(va.fecha_confirmacion AT TIME ZONE :tz) BETWEEN :inicio::date AND DATE(NOW() AT TIME ZONE :tz)`,
        {
          tz: this.businessTimeZone,
          inicio: fechaInicio,
        },
      )
      .groupBy(fechaAlojExpr)
      .getRawMany<{ fecha: string; total: string }>();

    const acumulado = new Map<string, number>();
    for (const key of fechas) acumulado.set(key, 0);

    for (const row of ventasPos) {
      if (!acumulado.has(row.fecha)) continue;
      acumulado.set(row.fecha, (acumulado.get(row.fecha) ?? 0) + Number(row.total ?? 0));
    }

    for (const row of ventasAlojamiento) {
      if (!acumulado.has(row.fecha)) continue;
      acumulado.set(row.fecha, (acumulado.get(row.fecha) ?? 0) + Number(row.total ?? 0));
    }

    return fechas.map((fecha) => ({
      fecha,
      totalVentas: (acumulado.get(fecha) ?? 0).toFixed(2),
    }));
  }
}
