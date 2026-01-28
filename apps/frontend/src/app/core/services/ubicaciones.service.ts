import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type UbicacionTipo = 'BODEGA' | 'SALA_VENTA';

export interface Ubicacion {
  id: string;
  nombre: string;
  tipo: UbicacionTipo;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUbicacionDto {
  nombre: string;
  tipo: UbicacionTipo;
}

export interface UpdateUbicacionDto {
  nombre?: string;
  activa?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UbicacionesService {
  private http = inject(HttpClient);

  list(tipo?: UbicacionTipo, includeInactive = true) {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    params.set('includeInactive', String(includeInactive));
    const qs = params.toString();
    return this.http.get<Ubicacion[]>(`/api/ubicaciones${qs ? `?${qs}` : ''}`);
  }

  create(dto: CreateUbicacionDto) {
    return this.http.post<Ubicacion>('/api/ubicaciones', dto);
  }

  update(id: string, dto: UpdateUbicacionDto) {
    return this.http.patch<Ubicacion>(`/api/ubicaciones/${id}`, dto);
  }

  remove(id: string) {
    return this.http.delete<{ ok: true }>(`/api/ubicaciones/${id}`);
  }
}
