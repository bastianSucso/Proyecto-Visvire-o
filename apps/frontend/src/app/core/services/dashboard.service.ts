import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type EstadoCajaOperativa = 'ABIERTA' | 'CERRADA' | 'SIN_JORNADA';

export interface OcupacionDetalleItem {
  habitacionId: string;
  habitacion: string;
  huespedNombreCompleto: string;
}

export interface DashboardOperativoHoyResponse {
  fechaNegocio: string;
  timeZone: string;
  totalVentasDia: string;
  cantidadVentasDia: number;
  gananciaBrutaDia: string;
  costoProductosVendidosDia: string;
  costoAlojamientoDia: string;
  estadoCaja: EstadoCajaOperativa;
  ocupacion: {
    porcentaje: number;
    habitacionesHabilitadas: number;
    habitacionesOcupadas: number;
    detalle: OcupacionDetalleItem[];
  };
  ventasPorDia: {
    fecha: string;
    totalVentas: string;
  }[];
  periodoVentasDias: 7 | 30;
  notaCogs: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getOperativoHoy(dias: 7 | 30 = 7) {
    return this.http.get<DashboardOperativoHoyResponse>('/api/dashboard/admin/operativo-hoy', {
      params: { dias: String(dias) },
    });
  }
}
