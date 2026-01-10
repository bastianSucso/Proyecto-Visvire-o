import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Producto {
  id: string;
  name: string;
  internalCode: string;
  barcode: string | null;
  unidadBase: string | null;
  stockBodega: number;
  stockSalaVenta: number;
  precioCosto: string;
  precioVenta: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  cantidadTotal: number;
  gananciaProducto: number;
}

export interface CreateProductoDto {
  name: string;
  internalCode: string;
  barcode?: string;
  unidadBase?: string;
  precioCosto: number;
  precioVenta: number;
  stockBodega?: number;
  stockSalaVenta?: number;
}

export interface UpdateProductoDto {
  name?: string;
  internalCode?: string;
  barcode?: string | null;
  unidadBase?: string | null;
  precioCosto?: number;
  precioVenta?: number;
  stockBodega?: number;
  stockSalaVenta?: number;
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
}
