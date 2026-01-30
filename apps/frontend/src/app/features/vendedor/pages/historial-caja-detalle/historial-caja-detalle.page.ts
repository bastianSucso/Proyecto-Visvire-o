import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CajaService, CajaResumenResponse } from '../../../../core/services/caja.service';
import { VentasService, VentaListItem } from '../../../../core/services/ventas.service';

@Component({
  selector: 'app-historial-caja-detalle-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './historial-caja-detalle.page.html',
})
export class HistorialCajaDetallePage {
  private cajaService = inject(CajaService);
  private ventasService = inject(VentasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  resumen: CajaResumenResponse | null = null;
  ventas: VentaListItem[] = [];
  loading = false;
  errorMsg = '';

  ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = Number(raw);
    if (!id || Number.isNaN(id)) {
      this.errorMsg = 'Sesión inválida.';
      return;
    }

    this.loading = true;
    this.cajaService.resumenSesion(id).subscribe({
      next: (data) => (this.resumen = data),
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'No se pudo cargar el resumen.';
      },
      complete: () => (this.loading = false),
    });

    this.ventasService.listar(id).subscribe({
      next: (data) => {
        this.ventas = (data ?? []).filter((v) => v.estado === 'CONFIRMADA');
      },
      error: () => {},
    });
  }

  volver() {
    this.router.navigate(['/pos/historial-caja']);
  }
}
