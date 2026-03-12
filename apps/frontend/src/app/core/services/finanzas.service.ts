import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export type MovimientoFinancieroTipo = 'INGRESO' | 'EGRESO';

export type MovimientoFinancieroOrigenTipo =
  | 'EXTERNO_MANUAL'
  | 'VENTA_POS'
  | 'VENTA_ALOJAMIENTO'
  | 'EGRESO_MANUAL'
  | 'INVENTARIO_INGRESO'
  | 'RRHH_PAGO';

export type MetodoPagoFinanciero = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO';

export interface MovimientoFinanciero {
  id: string;
  tipo: MovimientoFinancieroTipo;
  origenTipo: MovimientoFinancieroOrigenTipo;
  origenId: string | null;
  monto: number;
  moneda: string;
  categoria: string;
  descripcion: string | null;
  metodoPago: MetodoPagoFinanciero | null;
  referencia: string | null;
  fechaMovimiento: string;
  aplicaCreditoFiscal: boolean | null;
  ivaTasa: number;
  metadata: Record<string, unknown> | null;
  estado: 'ACTIVO' | 'ANULADO';
  createdAt: string;
  createdBy: { idUsuario: string; email: string } | null;
}

export interface RegistrarIngresoExternoDto {
  monto: number;
  categoria: string;
  descripcion?: string;
  metodoPago?: MetodoPagoFinanciero;
  referencia?: string;
  fechaMovimiento?: string;
  aplicaCreditoFiscal?: boolean;
}

export interface RegistrarEgresoManualDto {
  monto: number;
  categoria: string;
  descripcion?: string;
  metodoPago?: MetodoPagoFinanciero;
  referencia?: string;
  fechaMovimiento?: string;
  aplicaCreditoFiscal?: boolean;
}

export interface ActualizarMovimientoManualDto {
  monto?: number;
  categoria?: string;
  descripcion?: string;
  metodoPago?: MetodoPagoFinanciero;
  referencia?: string;
  fechaMovimiento?: string;
  aplicaCreditoFiscal?: boolean;
}

export interface FiltroMovimientosFinancieros {
  from?: string;
  to?: string;
  categoria?: string;
  tipo?: MovimientoFinancieroTipo;
  origenTipo?: MovimientoFinancieroOrigenTipo;
}

export interface IvaPeriodoResponse {
  periodo: { from: string; to: string; timeZone: string };
  ivaDebito: number;
  ivaCredito: number;
  ivaNeto: number;
  estadoIva: 'IVA_A_PAGAR' | 'REMANENTE_A_FAVOR' | 'SIN_DIFERENCIA';
}

export interface ResumenFinancieroResponse {
  periodo: { from: string; to: string; timeZone: string };
  ingresosTotales: number;
  ingresosPorOrigen: Record<string, number>;
  egresosTotales: number;
  egresosPorOrigen: Record<string, number>;
  resultadoPeriodo: number;
  iva: IvaPeriodoResponse;
}

export interface PagedResponse<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ReporteVentasDiarioItem {
  fecha: string;
  cantidadJornadas: number;
  primeraApertura: string | null;
  ultimoCierre: string | null;
  totalEfectivo: number;
  totalTarjeta: number;
  totalVentas: number;
  cantidadVentas: number;
  gananciaBruta: number;
}

export interface ResponsableJornada {
  idUsuario: string | null;
  nombre: string | null;
  email: string | null;
}

export interface JornadaReporteVentasDetalleVenta {
  ventaId: number;
  tipo: 'VENTA_POS' | 'VENTA_ALOJAMIENTO';
  fechaVenta: string;
  medioPago: 'EFECTIVO' | 'TARJETA' | null;
  detalle: string;
  asignacionId: string | null;
  montoTotal: number;
}

export interface JornadaReporteVentasDetalle {
  sesionCajaId: number;
  estado: 'ABIERTA' | 'CERRADA';
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: number;
  montoFinal: number;
  totalEfectivo: number;
  totalTarjeta: number;
  responsableCierre: ResponsableJornada;
  totalVentas: number;
  cantidadVentas: number;
  gananciaBruta: number;
  ventas: JornadaReporteVentasDetalleVenta[];
}

export interface ReporteVentasDiarioResumen {
  cantidadJornadas: number;
  totalVentas: number;
  cantidadVentas: number;
  gananciaBruta: number;
  totalEfectivo: number;
  totalTarjeta: number;
}

export interface ReporteVentasDiarioDetalleResponse {
  fecha: string;
  resumenDia: ReporteVentasDiarioResumen;
  jornadas: JornadaReporteVentasDetalle[];
}

export interface VentaPosDetalleAdminResponse {
  tipo: 'VENTA_POS';
  venta: {
    idVenta: number;
    estado: 'CONFIRMADA';
    fechaCreacion: string;
    fechaConfirmacion: string | null;
    medioPago: 'EFECTIVO' | 'TARJETA' | null;
    totalVenta: number;
    cantidadTotal: number;
    cogsTotalSnapshot: number;
    gananciaBrutaSnapshot: number;
  };
  sesion: {
    idSesionCaja: number | null;
    fechaApertura: string | null;
    fechaCierre: string | null;
    cajaNumero: string | number | null;
    responsable: {
      idUsuario: string | null;
      nombre: string | null;
      email: string | null;
    };
  };
  items: Array<{
    idItem: number;
    productoId: string | null;
    nombreProducto: string | null;
    unidadProducto: string | null;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    costoUnitarioSnapshot: number;
    cogsSnapshot: number;
  }>;
}

export interface VentaAlojamientoDetalleAdminResponse {
  tipo: 'VENTA_ALOJAMIENTO';
  venta: {
    idVentaAlojamiento: number;
    fechaConfirmacion: string;
    medioPago: 'EFECTIVO' | 'TARJETA' | null;
    montoTotal: number;
    cogsTotalSnapshot: number;
    gananciaBrutaSnapshot: number;
  };
  sesion: {
    idSesionCaja: number | null;
    fechaApertura: string | null;
    fechaCierre: string | null;
    cajaNumero: string | number | null;
    responsable: {
      idUsuario: string | null;
      nombre: string | null;
      email: string | null;
    };
  };
  asignacion: {
    id: string | null;
    estado: 'ACTIVA' | 'FINALIZADA' | null;
    tipoCobro: 'DIRECTO' | 'EMPRESA_CONVENIO' | null;
    noches: number;
    fechaIngreso: string | null;
    fechaSalidaEstimada: string | null;
    fechaSalidaReal: string | null;
  };
  habitacion: {
    id: string | null;
    identificador: string | null;
    pisoNombre: string | null;
  };
  huesped: {
    id: string | null;
    nombreCompleto: string | null;
    rut: string | null;
    correo: string | null;
    telefono: string | null;
    empresaNombre: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class FinanzasService {
  private readonly http = inject(HttpClient);

  private toParams(filters?: FiltroMovimientosFinancieros) {
    let params = new HttpParams();
    if (!filters) return params;

    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.categoria) params = params.set('categoria', filters.categoria);
    if (filters.tipo) params = params.set('tipo', filters.tipo);
    if (filters.origenTipo) params = params.set('origenTipo', filters.origenTipo);

    return params;
  }

  registrarIngresoExterno(dto: RegistrarIngresoExternoDto) {
    return this.http.post<MovimientoFinanciero>('/api/finanzas/ingresos-externos', dto);
  }

  listarIngresosExternos(filters?: FiltroMovimientosFinancieros) {
    return this.http.get<MovimientoFinanciero[]>('/api/finanzas/ingresos-externos', {
      params: this.toParams(filters),
    });
  }

  registrarEgresoManual(dto: RegistrarEgresoManualDto) {
    return this.http.post<MovimientoFinanciero>('/api/finanzas/egresos-manuales', dto);
  }

  listarEgresosManuales(filters?: FiltroMovimientosFinancieros) {
    return this.http.get<MovimientoFinanciero[]>('/api/finanzas/egresos-manuales', {
      params: this.toParams(filters),
    });
  }

  listarMovimientos(filters?: FiltroMovimientosFinancieros) {
    return this.http.get<MovimientoFinanciero[]>('/api/finanzas/movimientos', {
      params: this.toParams(filters),
    });
  }

  actualizarMovimientoManual(id: string, dto: ActualizarMovimientoManualDto) {
    return this.http.patch<MovimientoFinanciero>(`/api/finanzas/movimientos/${id}`, dto);
  }

  anularMovimientoManual(id: string, motivo?: string) {
    return this.http.request<MovimientoFinanciero>('DELETE', `/api/finanzas/movimientos/${id}`, {
      body: { motivo },
    });
  }

  obtenerIva(periodo: 'hoy' | 'semana' | 'mes' = 'mes', from?: string, to?: string) {
    let params = new HttpParams().set('periodo', periodo);
    if (from && to) {
      params = params.set('from', from).set('to', to);
    }
    return this.http.get<IvaPeriodoResponse>('/api/finanzas/iva', { params });
  }

  obtenerResumen(periodo: 'hoy' | 'semana' | 'mes' = 'mes', from?: string, to?: string) {
    let params = new HttpParams().set('periodo', periodo);
    if (from && to) {
      params = params.set('from', from).set('to', to);
    }
    return this.http.get<ResumenFinancieroResponse>('/api/finanzas/resumen', { params });
  }

  listarReporteVentasDiario(filters?: { fecha?: string; page?: number; pageSize?: number }) {
    let params = new HttpParams();
    if (filters?.fecha) params = params.set('fecha', filters.fecha);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));

    return this.http.get<PagedResponse<ReporteVentasDiarioItem>>('/api/finanzas/historico-diario', {
      params,
    });
  }

  obtenerReporteVentasDetalleDia(fecha: string) {
    return this.http.get<ReporteVentasDiarioDetalleResponse>(`/api/finanzas/historico-diario/${fecha}/jornadas`);
  }

  obtenerDetalleVentaPos(ventaId: number) {
    return this.http.get<VentaPosDetalleAdminResponse>(`/api/finanzas/operaciones/venta-pos/${ventaId}`);
  }

  obtenerDetalleVentaAlojamiento(ventaAlojamientoId: number) {
    return this.http.get<VentaAlojamientoDetalleAdminResponse>(
      `/api/finanzas/operaciones/venta-alojamiento/${ventaAlojamientoId}`,
    );
  }
}
