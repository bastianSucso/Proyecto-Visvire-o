import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductoTipo } from './productos.service';

export type AlteraTipo = 'INGRESO' | 'AJUSTE' | 'SALIDA' | 'TRASPASO' | 'CONVERSION_PRODUCTO';

export interface InventarioStockItem {
  id: string;
  name: string;
  internalCode: string;
  barcode: string | null;
  unidadBase: string | null;
  tipo: ProductoTipo;
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
  producto: {
    id: string;
    name: string;
    internalCode: string;
    barcode: string | null;
    tipo: ProductoTipo;
  } | null;
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
  unidad?: string | null;
  motivo: string | null;
  fecha: string;
  producto: { id: string; name: string; internalCode: string; barcode: string | null } | null;
  ubicacion: { id: string; nombre: string; tipo: string } | null;
  origen: { id: string; nombre: string; tipo: string } | null;
  destino: { id: string; nombre: string; tipo: string } | null;
  usuario: { id: string; email: string } | null;
  ventaId?: number | null;
  documentoRef: string | null;
}

export interface MovimientoDetalleItem {
  id: number;
  cantidad: number;
  unidad: string | null;
  producto: {
    id: string;
    name: string;
    internalCode: string;
    barcode: string | null;
    tipo: ProductoTipo;
  } | null;
}

export interface MovimientoDetalleResumen {
  factor: number | null;
  cantidadOrigen: number;
  cantidadDestino: number;
}

export interface MovimientoDetalleResponse {
  tipo: 'SALIDA' | 'CONVERSION_PRODUCTO';
  ref: string;
  fecha: string;
  usuario: { id: string; email: string } | null;
  ubicacion: { id: string; nombre: string; tipo: string } | null;
  resumen?: MovimientoDetalleResumen;
  items: MovimientoDetalleItem[];
}

export interface ConvertirProductoDto {
  productoOrigenId: string;
  productoDestinoId: string;
  ubicacionId: string;
  cantidadOrigen: number;
  factor: number;
}

export interface ConversionFactorResponse {
  factor: number | null;
  source: 'direct' | 'inverse' | 'none';
}

export interface CreateConversionFactorDto {
  productoOrigenId: string;
  productoDestinoId: string;
  factor: number;
}

export interface CreateIngresoDto {
  productoId: string;
  ubicacionId: string;
  cantidad: number;
  costoIngreso: number;
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

export interface DocumentoIngresoItemInput {
  productoId: string;
  cantidad: number;
  costoIngreso: number;
}

export interface CreateDocumentoIngresoDto {
  destinoId: string;
  items: DocumentoIngresoItemInput[];
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

  obtenerMovimientoDetalle(tipo: 'SALIDA' | 'CONVERSION_PRODUCTO', ref: string) {
    return this.http.get<MovimientoDetalleResponse>(
      `/api/inventario/movimientos/detalle/${tipo}/${encodeURIComponent(ref)}`,
    );
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

  convertirProducto(dto: ConvertirProductoDto) {
    return this.http.post<{ ok: true }>(`/api/inventario/convertir-producto`, dto);
  }

  obtenerConversion(origenId: string, destinoId: string) {
    const query = `?origenId=${encodeURIComponent(origenId)}&destinoId=${encodeURIComponent(destinoId)}`;
    return this.http.get<ConversionFactorResponse>(`/api/inventario/conversiones${query}`);
  }

  guardarConversion(dto: CreateConversionFactorDto) {
    return this.http.post<{ ok: true }>(`/api/inventario/conversiones`, dto);
  }
}
