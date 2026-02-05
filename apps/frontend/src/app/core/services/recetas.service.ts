import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface RecetaItem {
  id: number;
  cantidadBase: string;
  comida: { id: string; name: string; unidadBase: string | null; rendimiento: string | null } | null;
  grupo: {
    id: string;
    name: string;
    consumoStrategy: 'PRIORITY' | 'LOWEST_COST';
    unidadBase: string | null;
  } | null;
}

export interface CreateRecetaDto {
  comidaId: string;
  grupoId: string;
  cantidadBase: number;
}

export interface UpdateRecetaDto {
  cantidadBase?: number;
}

export interface RecetaCostoItem {
  id: number;
  grupo: {
    id: string;
    name: string;
    consumoStrategy: 'PRIORITY' | 'LOWEST_COST';
    unidadBase: string | null;
  } | null;
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

export interface RecetaPosiblesItem {
  comidaId: string;
  nombre: string;
  unidadBase: string | null;
  posibles: number;
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

  posibles() {
    return this.http.get<RecetaPosiblesItem[]>('/api/recetas/posibles');
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
