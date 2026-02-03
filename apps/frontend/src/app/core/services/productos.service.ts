import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Producto {
  id: string;
  name: string;
  internalCode: string;
  barcode: string | null;
  unidadBase: string | null;
  stockSalaVenta?: number;
  precioCosto: string;
  precioVenta: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tipos?: ProductoTipo[];
  rendimiento?: string | null;

  cantidadTotal?: number;
}

export type ProductoTipo = 'REVENTA' | 'INSUMO' | 'COMIDA';

export interface CreateProductoDto {
  name: string;
  internalCode: string;
  barcode?: string;
  unidadBase?: string;
  precioCosto: number;
  precioVenta: number;
  tipos?: ProductoTipo[];
  rendimiento?: number;
}

export interface UpdateProductoDto {
  name?: string;
  internalCode?: string;
  barcode?: string | null;
  unidadBase?: string | null;
  precioCosto?: number;
  precioVenta?: number;
  tipos?: ProductoTipo[];
  rendimiento?: number | null;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
    private http = inject(HttpClient);

    list(includeInactive = true) {
        return this.http.get<Producto[]>(
        `/api/productos?includeInactive=${includeInactive}`,
        );
    }
  
    create(dto: CreateProductoDto) {
        return this.http.post<Producto>('/api/productos', dto);
    }

    update(id: string, dto: UpdateProductoDto) {
        return this.http.patch<Producto>(`/api/productos/${id}`, dto);
    }
    
    setActive(id: string, isActive: boolean) {
        return this.http.patch<Producto>(
        `/api/productos/${id}/active`,
        { isActive },
        );
    }

    remove(id: string) {
        return this.http.delete<{ ok: true }>(`/api/productos/${id}`);
    }

  listSala() {
    return this.http.get<Producto[]>('/api/productos/sala');
  }

    suggestInternalCode() {
        return this.http.get<{ internalCode: string }>(`/api/productos/suggest-internal-code`);
    }

  lookupByBarcode(barcode: string) {
    const query = `?barcode=${encodeURIComponent(barcode)}`;
    return this.http.get<Producto>(`/api/productos/lookup${query}`);
  }

}
