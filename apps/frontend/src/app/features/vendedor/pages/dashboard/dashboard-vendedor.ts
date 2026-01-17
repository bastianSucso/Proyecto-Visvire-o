import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-vendedor-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-venedor.html',
})
export class DashboarVendedordPage {
  private router = inject(Router);

  irHistorial() {
    this.router.navigate(
      ['/pos/incidencias'],
      { queryParams: { view: 'historial' } }
    );
  }
}
