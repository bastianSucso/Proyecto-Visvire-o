import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface InconsistenciaCategoria {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  esSistema: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInconsistenciaCategoriaDto {
  nombre: string;
  descripcion?: string;
  orden?: number;
  activa?: boolean;
}

export interface UpdateInconsistenciaCategoriaDto {
  nombre?: string;
  descripcion?: string;
  orden?: number;
  activa?: boolean;
}

@Injectable({ providedIn: 'root' })
export class InconsistenciasCategoriasService {
  private readonly http = inject(HttpClient);

  listActivas() {
    return this.http.get<InconsistenciaCategoria[]>('/api/inconsistencias-categorias');
  }

  list(includeInactive = true) {
    const params = new HttpParams().set('includeInactive', String(includeInactive));
    return this.http.get<InconsistenciaCategoria[]>('/api/admin/inconsistencias-categorias', { params });
  }

  create(dto: CreateInconsistenciaCategoriaDto) {
    return this.http.post<InconsistenciaCategoria>('/api/admin/inconsistencias-categorias', dto);
  }

  update(id: string, dto: UpdateInconsistenciaCategoriaDto) {
    return this.http.patch<InconsistenciaCategoria>(`/api/admin/inconsistencias-categorias/${id}`, dto);
  }

  remove(id: string) {
    return this.http.delete<{ ok: true }>(`/api/admin/inconsistencias-categorias/${id}`);
  }
}
