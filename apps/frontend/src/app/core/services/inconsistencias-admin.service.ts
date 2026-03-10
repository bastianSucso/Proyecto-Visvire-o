import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export type InconsistenciaCategoria = 'FALTANTE' | 'EXCEDENTE' | 'DANIO' | 'VENCIDO' | 'OTRO';
export type InconsistenciaContexto = 'DURANTE_JORNADA' | 'FUERA_JORNADA';
export type InconsistenciaEstado =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'RESUELTA_CON_AJUSTE'
  | 'RESUELTA_SIN_AJUSTE';

export interface InconsistenciaListItem {
  id: number;
  estado: InconsistenciaEstado;
  stockTeorico: string;
  stockRealObservado: string;
  diferencia: string;
  createdAt: string;
  incidencia: {
    id: number;
    contexto: InconsistenciaContexto;
    tipo: InconsistenciaCategoria;
    fechaHoraDeteccion: string;
    observacion: string | null;
    producto: { id: string; name: string; internalCode: string };
    sesionCaja: { id: number; fechaApertura: string; fechaCierre: string | null } | null;
  };
}

export interface InconsistenciaDetalle extends InconsistenciaListItem {
  bitacora: Array<{
    id: number;
    accion: 'OBSERVACION' | 'CAMBIO_ESTADO' | 'AJUSTE_STOCK' | 'CIERRE';
    descripcion: string;
    estadoResultante: InconsistenciaEstado | null;
    createdAt: string;
    adminAutor: { idUsuario: string; email: string | null; nombre: string | null };
  }>;
  contextoJornada: {
    sesionCajaId: number;
    fechaApertura: string;
    fechaCierre: string | null;
    totalVentas: string;
    cantidadVentas: number;
    totalEfectivo: string;
    totalTarjeta: string;
  } | null;
  constanciasVendedor: Array<{
    id: number;
    tipo: InconsistenciaCategoria;
    cantidad: string;
    observacion: string | null;
    fecha: string;
    usuario: { idUsuario: string; email: string | null; nombre: string | null };
  }>;
}

export interface CreateInconsistenciaAdminDto {
  sesionCajaId?: number;
  productoId: string;
  ubicacionId?: string;
  contexto: InconsistenciaContexto;
  fechaHoraDeteccion?: string;
  tipo: InconsistenciaCategoria;
  cantidad: number;
  observacion: string;
  stockTeorico: number;
  stockRealObservado: number;
  costoUnitarioSnapshot?: number;
}

export interface PerdidasResumenResponse {
  totalMontoPerdida: number;
  totalCantidadPerdida: number;
  topProductos: Array<{
    productoId: string;
    productoNombre: string;
    cantidadPerdida: number;
    montoPerdida: number;
  }>;
  distribucionCategoria: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class InconsistenciasAdminService {
  private readonly http = inject(HttpClient);

  listar(filters?: {
    estado?: InconsistenciaEstado;
    tipo?: InconsistenciaCategoria;
    contexto?: InconsistenciaContexto;
    fecha?: string;
  }) {
    let params = new HttpParams();
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.tipo) params = params.set('tipo', filters.tipo);
    if (filters?.contexto) params = params.set('contexto', filters.contexto);
    if (filters?.fecha) params = params.set('fecha', filters.fecha);
    return this.http.get<InconsistenciaListItem[]>('/api/admin/inconsistencias', { params });
  }

  crear(dto: CreateInconsistenciaAdminDto) {
    return this.http.post<InconsistenciaDetalle>('/api/admin/inconsistencias', dto);
  }

  detalle(id: number) {
    return this.http.get<InconsistenciaDetalle>(`/api/admin/inconsistencias/${id}`);
  }

  agregarBitacora(
    id: number,
    dto: { descripcion: string; accion?: 'OBSERVACION' | 'CAMBIO_ESTADO' | 'AJUSTE_STOCK' | 'CIERRE' },
  ) {
    return this.http.post(`/api/admin/inconsistencias/${id}/bitacora`, dto);
  }

  cambiarEstado(id: number, dto: { estado: InconsistenciaEstado; descripcion?: string }) {
    return this.http.patch<InconsistenciaDetalle>(`/api/admin/inconsistencias/${id}/estado`, dto);
  }

  resolverConAjuste(
    id: number,
    dto: { cantidadAjuste: number; motivo: string; categoria?: InconsistenciaCategoria; descripcion?: string },
  ) {
    return this.http.post<InconsistenciaDetalle>(
      `/api/admin/inconsistencias/${id}/resolver-con-ajuste`,
      dto,
    );
  }

  resumenPerdidas(from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<PerdidasResumenResponse>('/api/admin/inconsistencias/perdidas/resumen', {
      params,
    });
  }
}
