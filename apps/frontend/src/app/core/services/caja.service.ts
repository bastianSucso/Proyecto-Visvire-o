import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CajaActualResponse {
  caja: {
    idCaja: number;
    numero: string;
    activa: boolean;
  };
  sesionCaja: {
    idSesionCaja: number;
    estado: 'ABIERTA' | 'CERRADA';
    montoInicial: string;
    montoFinal: string | null;
    fechaApertura: string;
    fechaCierre: string | null;
  };
  
}

export interface CajaResumenResponse {
  sesionCajaId: number;
  estado: 'ABIERTA' | 'CERRADA';
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: string;
  montoFinal: string | null;
  totalVentas: string;
  cantidadVentas: number;
  totalEfectivo: string;
  totalTarjeta: string;
  montoTotalCaja: string;
}

export interface SesionCajaResumenItem {
  idSesionCaja: number;
  estado: 'ABIERTA' | 'CERRADA';
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: string;
  montoFinal: string | null;
  totalVentas: string;
  cantidadVentas: number;
  totalEfectivo: string;
  totalTarjeta: string;
  caja: { idCaja: number; numero: string; activa: boolean } | null;
}
export interface CajaFisica {
  idCaja: number;
  numero: string;
  activa: boolean;
}
@Injectable({ providedIn: 'root' })
export class CajaService {
  private http = inject(HttpClient);

  abrirCaja(dto: { montoInicial: number; cajaId?: number }) {
    return this.http.post<CajaActualResponse>('api/caja/abrir', dto);
  }

  cajaActual(): Observable<CajaActualResponse | null> {
    return this.http.get<CajaActualResponse | null>('/api/caja/actual');
  }

  listarCajasFisicas(soloActivas = true) {
    return this.http.get<CajaFisica[]>('/api/caja/fisicas', {
      params: { soloActivas: String(soloActivas) },
    });
  }

  resumenActual() {
    return this.http.get<CajaResumenResponse>('/api/caja/resumen/actual');
  }

  resumenSesion(sesionCajaId: number) {
    return this.http.get<CajaResumenResponse>(`/api/caja/resumen/${sesionCajaId}`);
  }

  cerrarCaja() {
    return this.http.post<CajaResumenResponse>('/api/caja/cerrar', {});
  }

  listarSesionesCerradas() {
    return this.http.get<SesionCajaResumenItem[]>('/api/caja/sesiones/cerradas');
  }

}
