import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface UnidadMedida {
  id: string;
  nombre: string;
  isActive: boolean;
  referencedCount: number;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class UnidadesMedidaService {
  private readonly http = inject(HttpClient);

  list(includeInactive = false) {
    return this.http.get<UnidadMedida[]>(`/api/unidades?includeInactive=${includeInactive}`);
  }

  create(nombre: string) {
    return this.http.post<UnidadMedida>('/api/unidades', { nombre });
  }

  updateNombre(id: string, nombre: string) {
    return this.http.patch<UnidadMedida>(`/api/unidades/${id}`, { nombre });
  }

  setActive(id: string, isActive: boolean) {
    return this.http.patch<UnidadMedida>(`/api/unidades/${id}/active`, { isActive });
  }

  remove(id: string) {
    return this.http.delete<{ ok: true }>(`/api/unidades/${id}`);
  }
}
