import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  InconsistenciasAdminService,
  PerdidasResumenResponse,
} from '../../../../../core/services/inconsistencias-admin.service';

@Component({
  selector: 'app-finanzas-perdidas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './finanzas-perdidas.page.html',
})
export class FinanzasPerdidasPage implements OnInit {
  private readonly inconsistenciasService = inject(InconsistenciasAdminService);

  from = '';
  to = '';
  loading = false;
  errorMsg = '';
  resumen: PerdidasResumenResponse | null = null;

  ngOnInit(): void {
    this.load();
  }

  onFiltersChange() {
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.inconsistenciasService.resumenPerdidas(this.from || undefined, this.to || undefined).subscribe({
      next: (res: PerdidasResumenResponse) => {
        this.resumen = res;
      },
      error: (err: any) => {
        const msg = err?.error?.message;
        this.errorMsg = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo cargar el resumen de pérdidas.');
      },
      complete: () => (this.loading = false),
    });
  }

  money(value: number) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value ?? 0);
  }

  entriesDistribucion(): Array<[string, number]> {
    if (!this.resumen) return [];
    const entries = Object.entries(this.resumen.distribucionCategoria) as Array<[string, number]>;
    return entries.sort((a, b) => b[1] - a[1]);
  }
}
