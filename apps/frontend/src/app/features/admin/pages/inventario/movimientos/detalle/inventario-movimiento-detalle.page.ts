import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  InventarioService,
  MovimientoDetalleResponse,
} from '../../../../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario-movimiento-detalle-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventario-movimiento-detalle.page.html',
})
export class InventarioMovimientoDetallePage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventarioService = inject(InventarioService);

  detalle: MovimientoDetalleResponse | null = null;
  loading = false;
  errorMsg = '';

  ngOnInit() {
    const tipo = this.route.snapshot.paramMap.get('tipo') as
      | 'SALIDA'
      | 'CONVERSION_PRODUCTO'
      | null;
    const ref = this.route.snapshot.paramMap.get('ref');

    if (!tipo || !ref) {
      this.errorMsg = 'Movimiento inválido.';
      return;
    }

    this.loading = true;
    this.inventarioService.obtenerMovimientoDetalle(tipo, ref).subscribe({
      next: (data) => (this.detalle = data),
      error: (err) => (this.errorMsg = err?.error?.message ?? 'No se pudo cargar el movimiento.'),
      complete: () => (this.loading = false),
    });
  }

  volver() {
    this.router.navigate(['/admin/inventario/movimientos']);
  }
}
