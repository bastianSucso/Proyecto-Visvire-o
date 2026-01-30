import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CajaService, SesionCajaResumenItem } from '../../../../core/services/caja.service';

@Component({
  selector: 'app-historial-caja-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './historial-caja.page.html',
})
export class HistorialCajaPage {
  private cajaService = inject(CajaService);

  sesiones: SesionCajaResumenItem[] = [];
  loading = false;
  errorMsg = '';

  q = '';
  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.cajaService.listarSesionesCerradas().subscribe({
      next: (data) => {
        this.sesiones = data ?? [];
        this.page = 1;
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'No se pudo cargar el historial.';
      },
      complete: () => (this.loading = false),
    });
  }

  private normalize(s: any) {
    return String(s ?? '').toLowerCase().trim();
  }

  get filtered(): SesionCajaResumenItem[] {
    const term = this.normalize(this.q);
    if (!term) return this.sesiones;

    return this.sesiones.filter((s) => {
      const hay = [
        s.idSesionCaja,
        s.caja?.numero,
        s.fechaApertura,
        s.fechaCierre,
      ]
        .map((x) => this.normalize(x))
        .join(' | ');
      return hay.includes(term);
    });
  }

  get totalItems() {
    return this.filtered.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): SesionCajaResumenItem[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get fromItem() {
    if (this.totalItems === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toItem() {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  onSearchChange() {
    this.page = 1;
  }

  onPageSizeChange() {
    this.page = 1;
  }

  first() {
    this.page = 1;
  }
  prev() {
    this.page = Math.max(1, this.page - 1);
  }
  next() {
    this.page = Math.min(this.totalPages, this.page + 1);
  }
  last() {
    this.page = this.totalPages;
  }
}
