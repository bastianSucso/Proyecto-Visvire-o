import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type IncidenciaTipo = 'FALTANTE' | 'EXCEDENTE' | 'DANIO' | 'VENCIDO' | 'OTRO';

export interface CreateIncidenciaStockDto {
  historialId: number;
  productoId: string;
  tipo: IncidenciaTipo;
  cantidad: number;
  observacion?: string;
}

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private http = inject(HttpClient);

  crearIncidencia(dto: CreateIncidenciaStockDto): Observable<any> {
    return this.http.post('/api/historial/incidencias', dto);
  }
}
