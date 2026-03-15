import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProductoTipo } from './productos.service';

export interface InventarioSalaObjetivo {
  id: string;
  stockIdeal: number;
  stockTeoricoSala: number;
  faltante: number;
  producto: {
    id: string;
    name: string;
    internalCode: string;
    barcode: string | null;
    unidadBase: string | null;
    tipo: ProductoTipo;
    isActive: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventarioSalaObjetivoDto {
  productoId: string;
  stockIdeal: number;
}

export interface UpdateInventarioSalaObjetivoDto {
  stockIdeal: number;
}

@Injectable({ providedIn: 'root' })
export class InventarioSalaObjetivosService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<InventarioSalaObjetivo[]>('/api/inventario/sala-objetivos');
  }

  create(dto: CreateInventarioSalaObjetivoDto) {
    return this.http.post<InventarioSalaObjetivo>('/api/inventario/sala-objetivos', dto);
  }

  update(id: string, dto: UpdateInventarioSalaObjetivoDto) {
    return this.http.patch<InventarioSalaObjetivo>(`/api/inventario/sala-objetivos/${id}`, dto);
  }

  remove(id: string) {
    return this.http.delete<{ ok: true }>(`/api/inventario/sala-objetivos/${id}`);
  }
}
