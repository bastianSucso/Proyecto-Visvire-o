import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  FinanzasService,
  HistoricoDiarioItem,
  PagedResponse,
} from '../../../../../core/services/finanzas.service';

@Component({
  selector: 'app-finanzas-historico-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './finanzas-historico.page.html',
})
export class FinanzasHistoricoPage implements OnInit {
  private readonly finanzasService = inject(FinanzasService);

  items: HistoricoDiarioItem[] = [];
  loading = false;
  errorMsg = '';

  fecha = '';
  page = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 1;
  readonly pageSizes = [10, 20, 50, 100];

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMsg = '';

    this.finanzasService
      .listarHistoricoDiario({
        fecha: this.fecha || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res: PagedResponse<HistoricoDiarioItem>) => {
          this.items = res.items ?? [];
          this.totalItems = res.meta?.totalItems ?? 0;
          this.totalPages = Math.max(1, res.meta?.totalPages ?? 1);
        },
        error: (err) => {
          this.items = [];
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg)
            ? msg.join(' | ')
            : (msg ?? 'No se pudo cargar el historico financiero.');
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  onFechaChange() {
    this.page = 1;
    this.load();
  }

  clearFecha() {
    this.fecha = '';
    this.page = 1;
    this.load();
  }

  onPageSizeChange() {
    this.page = 1;
    this.load();
  }

  first() {
    this.page = 1;
    this.load();
  }

  prev() {
    this.page = Math.max(1, this.page - 1);
    this.load();
  }

  next() {
    this.page = Math.min(this.totalPages, this.page + 1);
    this.load();
  }

  last() {
    this.page = this.totalPages;
    this.load();
  }

  get fromItem() {
    if (this.totalItems === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toItem() {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  money(value: number) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value ?? 0);
  }

  dateLabel(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map((it) => Number(it));
    const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'full',
      timeZone: 'America/Santiago',
    }).format(utc);
  }

  datetimeLabel(value: string | Date | null) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Santiago',
    }).format(new Date(value));
  }
}
