import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type VentaEstado = 'EN_EDICION' | 'CONFIRMADA' | 'ANULADA';
export type MedioPago = 'EFECTIVO' | 'TARJETA';

export interface VentaItemResponse {
  idItem: number;
  productoId: String;
  nombreProducto?: string;
  precioUnitario?: string; // backend puede enviar string por decimal
  cantidad: number;
  subtotal?: string;
}

export interface VentaListItem {
  idVenta: number;
  estado: VentaEstado;
  fechaCreacion: string;
  fechaConfirmacion: string | null;
  totalVenta: string;
  cantidadTotal: number;
  medioPago: MedioPago | null;
}

export interface VentaResponse {
  idVenta: number;
  estado: VentaEstado;
  fechaCreacion: string;
  fechaConfirmacion: string | null
  usuarioId: string;
  sesionCajaId: number;
  totalVenta?: string;
  cantidadTotal?: number;
  items?: VentaItemResponse[];
  medioPago: MedioPago | null;
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);
  crearVenta(): Observable<VentaResponse> {
    return this.http.post<VentaResponse>('/api/ventas', {});
  }

  obtenerVenta(idVenta: number): Observable<VentaResponse> {
    return this.http.get<VentaResponse>(`/api/ventas/${idVenta}`);
  }

  agregarItem(idVenta: number, payload: { productoId: string; cantidad: number }): Observable<VentaResponse> {
    return this.http.post<VentaResponse>(`/api/ventas/${idVenta}/items`, payload);
  }

  actualizarItem(idVenta: number, idItem: number, payload: { cantidad: number }): Observable<VentaResponse> {
    return this.http.patch<VentaResponse>(`/api/ventas/${idVenta}/items/${idItem}`, payload);
  }

  eliminarItem(idVenta: number, idItem: number): Observable<VentaResponse> {
    return this.http.delete<VentaResponse>(`/api/ventas/${idVenta}/items/${idItem}`);
  }

  confirmarVenta(idVenta: number, body: { medioPago: MedioPago }): Observable<VentaResponse> {
    return this.http.patch<VentaResponse>(`/api/ventas/${idVenta}/confirmar`, body);
  }
    
  listar(sesionCajaId: number) {
    return this.http.get<VentaListItem[]>(`/api/ventas?sesionCajaId=${sesionCajaId}`);
  }
  
  eliminarVenta(idVenta: number) {
    return this.http.delete<{ ok: true }>(`/api/ventas/${idVenta}`);
  }

}
