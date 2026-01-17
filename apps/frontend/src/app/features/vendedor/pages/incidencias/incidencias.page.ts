import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IncidenciasService, IncidenciaDto } from '../../../../core/services/incidencias.service';

type Vista = 'historico' | 'turno';

type Grupo = {
  idHistorial: number;
  fechaApertura: string;
  fechaCierre: string | null;
  items: IncidenciaDto[];
};

@Component({
  selector: 'app-incidencias-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './incidencias.page.html',
})
export class IncidenciasPage implements OnInit {
  private incidenciasApi = inject(IncidenciasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  view: Vista = 'historico';

  loading = false;
  errorMsg = '';

  incidencias: IncidenciaDto[] = [];
  grupos: Grupo[] = [];

  ngOnInit() {
    this.route.queryParamMap.subscribe((q) => {
      const v = q.get('view');
      this.view = v === 'turno' || v === 'historico' ? v : 'historico';
      this.cargar();
    });
  }

  cargar() {
    this.loading = true;
    this.errorMsg = '';

    const req$ =
      this.view === 'turno'
        ? this.incidenciasApi.misIncidenciasTurno()
        : this.incidenciasApi.misIncidencias();

    req$.subscribe({
      next: (data) => {
        this.incidencias = data ?? [];
        this.grupos = this.agruparPorHistorial(this.incidencias);
      },
      error: (e) => {
        // Si tu backend retorna 404 cuando no hay turno activo:
        if (e?.status === 404 && this.view === 'turno') {
          this.incidencias = [];
          this.grupos = [];
          this.errorMsg = 'No hay turno activo (caja abierta) para mostrar incidencias.';
          return;
        }

        this.errorMsg = e?.error?.message ?? 'No se pudieron cargar las incidencias.';
      },
      complete: () => (this.loading = false),
    });
  }

  private agruparPorHistorial(data: IncidenciaDto[]): Grupo[] {
    const map = new Map<number, Grupo>();

    for (const it of data) {
      const id = it.historial.idHistorial;
      if (!map.has(id)) {
        map.set(id, {
          idHistorial: id,
          fechaApertura: it.historial.fechaApertura,
          fechaCierre: it.historial.fechaCierre,
          items: [],
        });
      }
      map.get(id)!.items.push(it);
    }

    // Orden: jornada más reciente arriba
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.fechaApertura).getTime() - new Date(a.fechaApertura).getTime(),
    );
  }
  
  volver() {
    if (this.view === 'turno') {
      // vuelve a la operación del turno
      this.router.navigate(['/pos/productos-sala']);
    } else {
      // vuelve al dashboard del vendedor
      this.router.navigate(['/pos/dashboard-vendedor']);
    }
  }
  
}
