import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type IncidenciaTipo = 'FALTANTE' | 'EXCEDENTE' | 'DANIO' | 'VENCIDO' | 'OTRO';

export interface IncidenciaDto {
  id: number;
  fecha: string;
  tipo: 'FALTANTE' | 'EXCEDENTE' | 'DANIO' | 'VENCIDO' | 'OTRO';
  cantidad: number;
  observacion: string | null;
  producto: { id: string; name: string; internalCode: string; barcode?: string | null };
  historial: { idHistorial: number; fechaApertura: string; fechaCierre: string | null };
}

export interface CreateIncidenciaStockDto {
  sesionCajaId: number;
  productoId: string;
  tipo: IncidenciaTipo;
  cantidad: number;
  observacion?: string;
}

@Injectable({ providedIn: 'root' })
export class IncidenciasService {
    private http = inject(HttpClient);

    crearIncidencia(dto: CreateIncidenciaStockDto): Observable<IncidenciaDto> {
    return this.http.post<IncidenciaDto>('/api/sesion-caja/incidencias', dto);
    }

    misIncidencias(): Observable<IncidenciaDto[]> {
        return this.http.get<IncidenciaDto[]>('/api/sesion-caja/incidencias/mias');
    }

    misIncidenciasTurno(): Observable<IncidenciaDto[]> {
        return this.http.get<IncidenciaDto[]>('/api/sesion-caja/incidencias/mias/turno');
    }
}
