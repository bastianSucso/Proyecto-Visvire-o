import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProductoTipo } from './productos.service';

export interface HojaCompraItem {
  id: string;
  cantidad: number;
  precioCostoUnitario: number;
  subtotalEstimado: number;
  stockTotal: number;
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

export interface ProductoImportanteCompra {
  id: string;
  cantidadMinima: number;
  stockTotal: number;
  faltante: number;
  enHojaCompra: boolean;
  producto: {
    id: string;
    name: string;
    internalCode: string;
    barcode: string | null;
    unidadBase: string | null;
    tipo: ProductoTipo;
    isActive: boolean;
    precioCosto: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AddHojaCompraItemDto {
  productoId: string;
  cantidad: number;
}

export interface UpdateHojaCompraItemDto {
  cantidad: number;
}

export interface CreateProductoImportanteCompraDto {
  productoId: string;
  cantidadMinima: number;
}

export interface UpdateProductoImportanteCompraDto {
  cantidadMinima: number;
}

@Injectable({ providedIn: 'root' })
export class InventarioHojaCompraService {
  private readonly http = inject(HttpClient);

  listHojaCompra() {
    return this.http.get<HojaCompraItem[]>('/api/inventario/hoja-compra');
  }

  addHojaCompraItem(dto: AddHojaCompraItemDto) {
    return this.http.post<HojaCompraItem>('/api/inventario/hoja-compra', dto);
  }

  updateHojaCompraItem(id: string, dto: UpdateHojaCompraItemDto) {
    return this.http.patch<HojaCompraItem>(`/api/inventario/hoja-compra/${id}`, dto);
  }

  removeHojaCompraItem(id: string) {
    return this.http.delete<{ ok: true }>(`/api/inventario/hoja-compra/${id}`);
  }

  limpiarHojaCompra() {
    return this.http.post<HojaCompraItem[]>('/api/inventario/hoja-compra/limpiar', {});
  }

  listProductosImportantes() {
    return this.http.get<ProductoImportanteCompra[]>('/api/inventario/hoja-compra/productos-importantes');
  }

  createProductoImportante(dto: CreateProductoImportanteCompraDto) {
    return this.http.post<ProductoImportanteCompra>(
      '/api/inventario/hoja-compra/productos-importantes',
      dto,
    );
  }

  updateProductoImportante(id: string, dto: UpdateProductoImportanteCompraDto) {
    return this.http.patch<ProductoImportanteCompra>(
      `/api/inventario/hoja-compra/productos-importantes/${id}`,
      dto,
    );
  }

  removeProductoImportante(id: string) {
    return this.http.delete<{ ok: true }>(`/api/inventario/hoja-compra/productos-importantes/${id}`);
  }
}
