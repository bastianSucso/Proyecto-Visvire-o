import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export type InconsistenciaCategoria = 'FALTANTE' | 'DANIO' | 'VENCIDO' | 'OTRO';
export type InconsistenciaContexto = 'DURANTE_JORNADA' | 'FUERA_JORNADA';
export type InconsistenciaEstado =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'RESUELTA_CON_AJUSTE'
  | 'RESUELTA_SIN_AJUSTE';

export interface InconsistenciaResolucion {
  id: number;
  estadoFinal: 'RESUELTA_CON_AJUSTE' | 'RESUELTA_SIN_AJUSTE';
  stockTeorico: string;
  stockRealObservado: string;
  diferencia: string;
  categoria: InconsistenciaCategoria;
  motivoResolucion: string;
  resolvedAt: string;
  adminResuelve: { idUsuario: string; email: string | null; nombre: string | null };
  ajusteAplicado: { id: number; documentoRef: string | null } | null;
}

export interface InconsistenciaListItem {
  id: number;
  origen: 'VENDEDOR' | 'ADMIN';
  contexto: InconsistenciaContexto;
  fechaHoraDeteccion: string;
  tipo: InconsistenciaCategoria;
  cantidad: string;
  observacion: string | null;
  producto: { id: string; name: string; internalCode: string; unidadBase: string | null };
  ubicacion: { id: string; nombre: string; tipo: string };
  usuario: { idUsuario: string; email: string | null; nombre: string | null };
  sesionCaja: { id: number; fechaApertura: string; fechaCierre: string | null } | null;
  resolucionAdmin: InconsistenciaResolucion | null;
}

export interface InconsistenciaDetalle extends InconsistenciaListItem {
  estado: 'PENDIENTE' | 'RESUELTA_CON_AJUSTE' | 'RESUELTA_SIN_AJUSTE';
  stockTeoricoSistema: number;
  ubicacionUsadaResolucion: { id: string; nombre: string; tipo: string };
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
  productoId: string;
  ubicacionId: string;
  contexto: InconsistenciaContexto;
  fechaHoraDeteccion?: string;
  tipo: InconsistenciaCategoria;
  cantidad: number;
  observacion: string;
}

export interface InconsistenciaSesionActiva {
  sesionCajaId: number;
  fechaApertura: string;
  caja: { idCaja: number; numero: string } | null;
  vendedor: {
    idUsuario: string;
    nombre: string | null;
    apellido: string | null;
    email: string | null;
  } | null;
}

export interface ResolverInconsistenciaDto {
  stockRealObservado: number;
  motivoResolucion: string;
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

  sesionActiva() {
    return this.http.get<InconsistenciaSesionActiva | null>('/api/admin/inconsistencias/sesion-activa');
  }

  detalle(id: number) {
    return this.http.get<InconsistenciaDetalle>(`/api/admin/inconsistencias/${id}`);
  }

  resolver(id: number, dto: ResolverInconsistenciaDto) {
    return this.http.post<InconsistenciaDetalle>(`/api/admin/inconsistencias/${id}/resolver`, dto);
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
