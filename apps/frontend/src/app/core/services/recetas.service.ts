import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface RecetaItem {
  id: number;
  cantidadBase: string;
  comida: { id: string; name: string; unidadBase: string | null; rendimiento: string | null } | null;
  insumo: { id: string; name: string; unidadBase: string | null; precioCosto: string } | null;
}

export interface CreateRecetaDto {
  comidaId: string;
  insumoId: string;
  cantidadBase: number;
}

export interface UpdateRecetaDto {
  cantidadBase?: number;
}

export interface RecetaCostoItem {
  id: number;
  insumo: { id: string; name: string; unidadBase: string | null; precioCosto: string } | null;
  cantidadBase: string;
  costoUnitario: string;
  subtotal: string;
}

export interface RecetaCostoResponse {
  comida: { id: string; name: string; unidadBase: string | null; rendimiento: string | null } | null;
  totalCosto: string;
  rendimiento: string | null;
  costoPorcion: string | null;
  items: RecetaCostoItem[];
}

@Injectable({ providedIn: 'root' })
export class RecetasService {
  private http = inject(HttpClient);

  list(comidaId: string) {
    return this.http.get<RecetaItem[]>(`/api/recetas?comidaId=${comidaId}`);
  }

  costos(comidaId: string) {
    return this.http.get<RecetaCostoResponse>(`/api/recetas/costos?comidaId=${comidaId}`);
  }

  create(dto: CreateRecetaDto) {
    return this.http.post<RecetaItem>('/api/recetas', dto);
  }

  update(id: number, dto: UpdateRecetaDto) {
    return this.http.patch<RecetaItem>(`/api/recetas/${id}`, dto);
  }

  remove(id: number) {
    return this.http.delete<{ ok: true }>(`/api/recetas/${id}`);
  }
}
