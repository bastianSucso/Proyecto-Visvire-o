import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MetodoPagoFinanciero } from './finanzas.service';

export type DocumentoTipo = 'RUT' | 'PASAPORTE' | 'OTRO';
export type TrabajadorEstado = 'ACTIVO' | 'INACTIVO';

export interface Trabajador {
  id: string;
  nombres: string;
  apellidos: string;
  documentoTipo: DocumentoTipo;
  documentoNumero: string;
  telefono: string | null;
  email: string | null;
  cargo: string | null;
  observacion: string | null;
  estado: TrabajadorEstado;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
}

export interface CrearTrabajadorDto {
  nombres: string;
  apellidos: string;
  documentoTipo: DocumentoTipo;
  documentoNumero: string;
  telefono?: string;
  email?: string;
  cargo?: string;
  observacion?: string;
}

export interface ActualizarTrabajadorDto {
  nombres?: string;
  apellidos?: string;
  documentoTipo?: DocumentoTipo;
  documentoNumero?: string;
  telefono?: string;
  email?: string;
  cargo?: string;
  observacion?: string;
}

export interface FiltroTrabajadores {
  q?: string;
  estado?: TrabajadorEstado;
}

export interface TrabajadorResumen {
  id: string;
  nombres: string;
  apellidos: string;
  documentoTipo: DocumentoTipo;
  documentoNumero: string;
  estado: TrabajadorEstado;
}

export interface PagoPersonal {
  id: string;
  trabajador: TrabajadorResumen;
  monto: number;
  moneda: string;
  fechaPago: string;
  concepto: string;
  descripcion: string | null;
  metodoPago: MetodoPagoFinanciero | null;
  referencia: string | null;
  adjuntoUrl: string | null;
  estado: 'ACTIVO' | 'ANULADO';
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
}

export interface CrearPagoPersonalDto {
  trabajadorId: string;
  monto: number;
  fechaPago?: string;
  concepto: string;
  descripcion?: string;
  metodoPago?: MetodoPagoFinanciero;
  referencia?: string;
  adjuntoUrl?: string;
}

export interface ActualizarPagoPersonalDto {
  motivo: string;
  monto?: number;
  fechaPago?: string;
  concepto?: string;
  descripcion?: string;
  metodoPago?: MetodoPagoFinanciero;
  referencia?: string;
  adjuntoUrl?: string;
}

export interface FiltroPagos {
  from?: string;
  to?: string;
  trabajadorId?: string;
}

export interface AnularPagoPersonalDto {
  motivo?: string;
}

@Injectable({ providedIn: 'root' })
export class RrhhService {
  private readonly http = inject(HttpClient);

  private toTrabajadoresParams(filters?: FiltroTrabajadores) {
    let params = new HttpParams();
    if (!filters) return params;

    if (filters.q) params = params.set('q', filters.q);
    if (filters.estado) params = params.set('estado', filters.estado);
    return params;
  }

  private toPagosParams(filters?: FiltroPagos) {
    let params = new HttpParams();
    if (!filters) return params;

    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.trabajadorId) params = params.set('trabajadorId', filters.trabajadorId);
    return params;
  }

  crearTrabajador(dto: CrearTrabajadorDto) {
    return this.http.post<Trabajador>('/api/rrhh/personal', dto);
  }

  listarTrabajadores(filters?: FiltroTrabajadores) {
    return this.http.get<Trabajador[]>('/api/rrhh/personal', {
      params: this.toTrabajadoresParams(filters),
    });
  }

  actualizarTrabajador(id: string, dto: ActualizarTrabajadorDto) {
    return this.http.patch<Trabajador>(`/api/rrhh/personal/${id}`, dto);
  }

  setEstadoTrabajador(id: string, estado: TrabajadorEstado) {
    return this.http.patch<Trabajador>(`/api/rrhh/personal/${id}/estado`, { estado });
  }

  crearPago(dto: CrearPagoPersonalDto) {
    return this.http.post<PagoPersonal>('/api/rrhh/pagos', dto);
  }

  listarPagos(filters?: FiltroPagos) {
    return this.http.get<PagoPersonal[]>('/api/rrhh/pagos', {
      params: this.toPagosParams(filters),
    });
  }

  actualizarPago(id: string, dto: ActualizarPagoPersonalDto) {
    return this.http.patch<PagoPersonal>(`/api/rrhh/pagos/${id}`, dto);
  }

  anularPago(id: string, dto?: AnularPagoPersonalDto) {
    return this.http.request<PagoPersonal>('DELETE', `/api/rrhh/pagos/${id}`, {
      body: dto,
    });
  }
}
