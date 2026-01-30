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
  producto: { id: string; name: string; internalCode: string; barcode: string | null } | null;
}

export interface InventarioDocumento {
  documentoRef: string;
  tipo: 'INGRESO' | 'TRASPASO';
  origen: { id: string; nombre: string; tipo: string } | null;
  destino: { id: string; nombre: string; tipo: string } | null;
  usuario: { id: string; email: string } | null;
  fecha: string;
  items: InventarioDocumentoItem[];
}

export interface InventarioDocumentoResumen {
  documentoRef: string;
  tipo: 'INGRESO' | 'TRASPASO';
  origen: { id: string; nombre: string; tipo: string } | null;
  destino: { id: string; nombre: string; tipo: string } | null;
  usuario: { id: string; email: string } | null;
  fecha: string;
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
  documentoRef: string | null;
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

export interface DocumentoItemInput {
  productoId: string;
  cantidad: number;
}

export interface CreateDocumentoIngresoDto {
  destinoId: string;
  items: DocumentoItemInput[];
}

export interface CreateDocumentoTraspasoDto {
  origenId: string;
  destinoId: string;
  items: DocumentoItemInput[];
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

  obtenerDocumento(documentoRef: string) {
    return this.http.get<InventarioDocumento>(`/api/inventario/documentos/${documentoRef}`);
  }
}
