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

}
