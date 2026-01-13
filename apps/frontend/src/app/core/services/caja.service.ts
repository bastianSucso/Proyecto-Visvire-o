import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CajaActualResponse {
  idCaja: number;
  estado: 'ABIERTA' | 'CERRADA';
  montoInicial: string;
  montoFinal: string | null;
  montoTotal: string;
  historial: {
    idHistorial: number;
    fechaApertura: string; // ISO
    fechaCierre: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class CajaService {
  private http = inject(HttpClient);

  abrirCaja(montoInicial: number): Observable<CajaActualResponse> {
    return this.http.post<CajaActualResponse>('/api/caja/abrir', { montoInicial });
  }

  cajaActual(): Observable<CajaActualResponse | null> {
    return this.http.get<CajaActualResponse | null>('/api/caja/actual');
  }
}
