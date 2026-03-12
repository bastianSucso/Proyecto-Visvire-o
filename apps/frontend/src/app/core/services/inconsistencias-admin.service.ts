import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export type InconsistenciaContexto = 'DURANTE_JORNADA' | 'FUERA_JORNADA';
export type InconsistenciaEstado =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'RESUELTA_CON_AJUSTE'
  | 'RESUELTA_SIN_AJUSTE';

export interface InconsistenciaCategoriaRef {
  id: string;
  codigo: string;
  nombre: string;
  activa: boolean;
}

export interface InconsistenciaResolucion {
  id: number;
  estadoFinal: 'RESUELTA_CON_AJUSTE' | 'RESUELTA_SIN_AJUSTE';
  stockTeorico: string;
  stockRealObservado: string;
  diferencia: string;
  categoria: InconsistenciaCategoriaRef;
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
  categoria: InconsistenciaCategoriaRef;
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
    categoria: InconsistenciaCategoriaRef;
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
  categoriaId: string;
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

export interface PerdidasResumenCategoria {
  categoriaId: string;
  codigo: string;
  nombre: string;
  montoPerdida: number;
  cantidadPerdida: number;
  porcentajeMonto: number;
}

export interface PerdidasResumenResponse {
  totalMontoPerdida: number;
  totalCantidadPerdida: number;
  totalProductosAfectados: number;
  totalCategoriasAfectadas: number;
  categorias: PerdidasResumenCategoria[];
}

export interface PerdidasProductoItem {
  productoId: string;
  productoNombre: string;
  cantidadPerdida: number;
  montoPerdida: number;
  ultimaResolucionAt: string;
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

@Injectable({ providedIn: 'root' })
export class InconsistenciasAdminService {
  private readonly http = inject(HttpClient);

  listar(filters?: {
    estado?: InconsistenciaEstado;
    categoriaId?: string;
    contexto?: InconsistenciaContexto;
    fecha?: string;
  }) {
    let params = new HttpParams();
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.categoriaId) params = params.set('categoriaId', filters.categoriaId);
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

  resumenPerdidas(from?: string, to?: string, categoriaId?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (categoriaId) params = params.set('categoriaId', categoriaId);
    return this.http.get<PerdidasResumenResponse>('/api/admin/inconsistencias/perdidas/resumen', {
      params,
    });
  }

  listarPerdidasProductos(filters?: {
    from?: string;
    to?: string;
    categoriaId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'montoPerdida' | 'cantidadPerdida';
    sortDir?: 'asc' | 'desc';
  }) {
    let params = new HttpParams();
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.categoriaId) params = params.set('categoriaId', filters.categoriaId);
    if (filters?.page) params = params.set('page', String(filters.page));
    if (filters?.pageSize) params = params.set('pageSize', String(filters.pageSize));
    if (filters?.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters?.sortDir) params = params.set('sortDir', filters.sortDir);

    return this.http.get<PagedResponse<PerdidasProductoItem>>(
      '/api/admin/inconsistencias/perdidas/productos',
      {
        params,
      },
    );
  }
}
