import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IncidenciasService, IncidenciaDto } from '../../../../core/services/incidencias.service';

type Vista = 'historico' | 'turno';

type Grupo = {
  idSesionCaja: number;
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
        this.grupos = this.agruparPorSesionCaja(this.incidencias);
      },
      error: (e) => {
        if (e?.status === 404 && this.view === 'turno') {
          this.incidencias = [];
          this.grupos = [];
          this.errorMsg = 'No hay una sesión activa (caja abierta) para mostrar incidencias.';
          return;
        }

        this.errorMsg = e?.error?.message ?? 'No se pudieron cargar las incidencias.';
      },
      complete: () => (this.loading = false),
    });
  }

  private agruparPorSesionCaja(data: IncidenciaDto[]): Grupo[] {
    const map = new Map<number, Grupo>();

    for (const it of data) {
      const ses = (it as any).sesionCaja; 
      const id = ses.idSesionCaja;

      if (!map.has(id)) {
        map.set(id, {
          idSesionCaja: id,
          fechaApertura: ses.fechaApertura,
          fechaCierre: ses.fechaCierre,
          items: [],
        });
      }

      map.get(id)!.items.push(it);
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.fechaApertura).getTime() - new Date(a.fechaApertura).getTime(),
    );
  }

  volver() {
    if (this.view === 'turno') {
      this.router.navigate(['/pos/productos-sala']);
    } else {
      this.router.navigate(['/pos/dashboard-vendedor']);
    }
  }
}
