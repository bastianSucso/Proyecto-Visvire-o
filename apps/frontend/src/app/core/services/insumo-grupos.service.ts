import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type InsumoGrupoStrategy = 'PRIORITY' | 'LOWEST_COST';

export interface InsumoGrupoItem {
  id: string;
  priority: number | null;
  isActive: boolean;
  producto: {
    id: string;
    name: string;
    internalCode: string;
    unidadBase: string | null;
    precioCosto: string;
    isActive: boolean;
  } | null;
}

export interface InsumoGrupo {
  id: string;
  name: string;
  consumoStrategy: InsumoGrupoStrategy;
  isActive: boolean;
  unidadBase: string | null;
  items: InsumoGrupoItem[];
}

export interface CreateInsumoGrupoDto {
  name: string;
  consumoStrategy: InsumoGrupoStrategy;
}

export interface UpdateInsumoGrupoDto {
  name?: string;
  consumoStrategy?: InsumoGrupoStrategy;
  isActive?: boolean;
}

export interface CreateInsumoGrupoItemDto {
  productoId: string;
  priority?: number;
}

export interface UpdateInsumoGrupoItemDto {
  priority?: number | null;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class InsumoGruposService {
  private http = inject(HttpClient);

  list(includeInactive = true) {
    return this.http.get<InsumoGrupo[]>(`/api/insumo-grupos?includeInactive=${includeInactive}`);
  }

  create(dto: CreateInsumoGrupoDto) {
    return this.http.post<InsumoGrupo>('/api/insumo-grupos', dto);
  }

  update(id: string, dto: UpdateInsumoGrupoDto) {
    return this.http.patch<InsumoGrupo>(`/api/insumo-grupos/${id}`, dto);
  }

  addItem(grupoId: string, dto: CreateInsumoGrupoItemDto) {
    return this.http.post<InsumoGrupoItem>(`/api/insumo-grupos/${grupoId}/items`, dto);
  }

  updateItem(itemId: string, dto: UpdateInsumoGrupoItemDto) {
    return this.http.patch<InsumoGrupoItem>(`/api/insumo-grupos/items/${itemId}`, dto);
  }

  removeItem(itemId: string) {
    return this.http.delete<{ ok: true }>(`/api/insumo-grupos/items/${itemId}`);
  }
}
