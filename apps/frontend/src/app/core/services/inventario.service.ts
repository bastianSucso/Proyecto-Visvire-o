import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type AlteraTipo = 'INGRESO' | 'AJUSTE' | 'SALIDA' | 'TRASPASO';

export interface InventarioStockItem {
  id: string;
  name: string;
  internalCode: string;
  barcode: string | null;
  unidadBase: string | null;
  isActive: boolean;
  cantidadTotal: number;
  stocks: {
    ubicacion: { id: string; nombre: string; tipo: string };
    cantidad: number;
  }[];
}

export interface InventarioDocumentoItem {
  id: number;
  cantidad: number;
  unidadBase: string | null;
  barcode: string | null;
  producto: { id: string; name: string; internalCode: string; barcode: string | null };
}

export interface InventarioDocumento {
  id: number;
  tipo: 'INGRESO' | 'TRASPASO';
  estado: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';
  origen: { id: string; nombre: string; tipo: string } | null;
  destino: { id: string; nombre: string; tipo: string } | null;
  usuario: { id: string; email: string } | null;
  fechaCreacion: string;
  fechaConfirmacion: string | null;
  items: InventarioDocumentoItem[];
}

export interface InventarioDocumentoResumen {
  id: number;
  tipo: 'INGRESO' | 'TRASPASO';
  estado: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';
  origen: { id: string; nombre: string; tipo: string } | null;
  destino: { id: string; nombre: string; tipo: string } | null;
  usuario: { id: string; email: string } | null;
  fechaCreacion: string;
  fechaConfirmacion: string | null;
  itemsCount: number;
  totalCantidad: number;
}

export interface InventarioMovimiento {
  id: number;
  tipo: AlteraTipo;
  cantidad: number;
  motivo: string | null;
  fecha: string;
  producto: { id: string; name: string; internalCode: string; barcode: string | null } | null;
  ubicacion: { id: string; nombre: string; tipo: string } | null;
  origen: { id: string; nombre: string; tipo: string } | null;
  destino: { id: string; nombre: string; tipo: string } | null;
  usuario: { id: string; email: string } | null;
  documento: { id: number; tipo: string } | null;
}

export interface CreateIngresoDto {
  productoId: string;
  ubicacionId: string;
  cantidad: number;
}

export interface CreateAjusteDto {
  productoId: string;
  ubicacionId: string;
  cantidad: number;
  motivo: string;
}

export interface CreateTraspasoDto {
  productoId: string;
  origenId: string;
  destinoId: string;
  cantidad: number;
}

export interface CreateDocumentoIngresoDto {
  destinoId: string;
}

export interface CreateDocumentoTraspasoDto {
  origenId: string;
  destinoId: string;
}

export interface AddDocumentoItemDto {
  productoId: string;
  cantidad: number;
}

export interface UpdateDocumentoItemDto {
  cantidad: number;
}

export interface UpdateDocumentoDto {
  origenId?: string;
  destinoId?: string;
}

export interface ConfirmDocumentoIngresoDto {
  destinoId: string;
  items: { productoId: string; cantidad: number }[];
}

export interface ConfirmDocumentoTraspasoDto {
  origenId: string;
  destinoId: string;
  items: { productoId: string; cantidad: number }[];
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);

  listarStock(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.http.get<InventarioStockItem[]>(`/api/inventario/stock${qs}`);
  }

  listarMovimientos(limit = 200) {
    return this.http.get<InventarioMovimiento[]>(`/api/inventario/movimientos?limit=${limit}`);
  }

  listarDocumentos(limit = 200) {
    return this.http.get<InventarioDocumentoResumen[]>(`/api/inventario/documentos?limit=${limit}`);
  }

  registrarIngreso(dto: CreateIngresoDto) {
    return this.http.post<InventarioMovimiento>('/api/inventario/ingresos', dto);
  }

  registrarAjuste(dto: CreateAjusteDto) {
    return this.http.post<InventarioMovimiento>('/api/inventario/ajustes', dto);
  }

  registrarTraspaso(dto: CreateTraspasoDto) {
    return this.http.post<InventarioMovimiento>('/api/inventario/traspasos', dto);
  }

  crearDocumentoIngreso(dto: CreateDocumentoIngresoDto) {
    return this.http.post<InventarioDocumento>('/api/inventario/documentos/ingreso', dto);
  }

  crearDocumentoTraspaso(dto: CreateDocumentoTraspasoDto) {
    return this.http.post<InventarioDocumento>('/api/inventario/documentos/traspaso', dto);
  }

  actualizarDocumento(id: number, dto: UpdateDocumentoDto) {
    return this.http.patch<InventarioDocumento>(`/api/inventario/documentos/${id}`, dto);
  }

  agregarItemDocumento(id: number, dto: AddDocumentoItemDto) {
    return this.http.post<InventarioDocumento>(`/api/inventario/documentos/${id}/items`, dto);
  }

  actualizarItemDocumento(id: number, itemId: number, dto: UpdateDocumentoItemDto) {
    return this.http.patch<InventarioDocumento>(
      `/api/inventario/documentos/${id}/items/${itemId}`,
      dto,
    );
  }

  eliminarItemDocumento(id: number, itemId: number) {
    return this.http.delete<InventarioDocumento>(`/api/inventario/documentos/${id}/items/${itemId}`);
  }

  confirmarDocumento(id: number) {
    return this.http.post<InventarioDocumento>(`/api/inventario/documentos/${id}/confirmar`, {});
  }

  confirmarDocumentoIngreso(dto: ConfirmDocumentoIngresoDto) {
    return this.http.post<InventarioDocumento>('/api/inventario/documentos/ingreso/confirmar', dto);
  }

  confirmarDocumentoTraspaso(dto: ConfirmDocumentoTraspasoDto) {
    return this.http.post<InventarioDocumento>('/api/inventario/documentos/traspaso/confirmar', dto);
  }

  obtenerDocumento(id: number) {
    return this.http.get<InventarioDocumento>(`/api/inventario/documentos/${id}`);
  }
}
