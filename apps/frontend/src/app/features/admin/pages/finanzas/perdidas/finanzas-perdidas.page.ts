import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  InconsistenciasAdminService,
  PagedResponse,
  PerdidasProductoItem,
  PerdidasResumenResponse,
} from '../../../../../core/services/inconsistencias-admin.service';
import {
  InconsistenciaCategoria,
  InconsistenciasCategoriasService,
} from '../../../../../core/services/inconsistencias-categorias.service';

@Component({
  selector: 'app-finanzas-perdidas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './finanzas-perdidas.page.html',
})
export class FinanzasPerdidasPage implements OnInit {
  private readonly inconsistenciasService = inject(InconsistenciasAdminService);
  private readonly categoriasService = inject(InconsistenciasCategoriasService);

  from = '';
  to = '';
  categoriaId = '';
  loading = false;
  loadingCategorias = false;
  errorMsg = '';
  resumen: PerdidasResumenResponse | null = null;
  productos: PerdidasProductoItem[] = [];
  categorias: InconsistenciaCategoria[] = [];

  page = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 1;
  readonly pageSizes = [10, 20, 50, 100];
  sortBy: 'montoPerdida' | 'cantidadPerdida' = 'montoPerdida';
  sortDir: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    this.loadCategorias();
    this.load();
  }

  onFiltersChange() {
    this.page = 1;
    this.load();
  }

  onPageSizeChange() {
    this.page = 1;
    this.load();
  }

  first() {
    if (this.page === 1) return;
    this.page = 1;
    this.load();
  }

  prev() {
    if (this.page === 1) return;
    this.page = Math.max(1, this.page - 1);
    this.load();
  }

  next() {
    if (this.page === this.totalPages) return;
    this.page = Math.min(this.totalPages, this.page + 1);
    this.load();
  }

  last() {
    if (this.page === this.totalPages) return;
    this.page = this.totalPages;
    this.load();
  }

  toggleSort(column: 'montoPerdida' | 'cantidadPerdida') {
    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      this.sortBy = column;
      this.sortDir = 'desc';
    }
    this.page = 1;
    this.load();
  }

  sortIcon(column: 'montoPerdida' | 'cantidadPerdida') {
    if (this.sortBy !== column) return '';
    return this.sortDir === 'desc' ? '▼' : '▲';
  }

  load() {
    this.loading = true;
    this.errorMsg = '';

    forkJoin({
      resumen: this.inconsistenciasService.resumenPerdidas(
        this.from || undefined,
        this.to || undefined,
        this.categoriaId || undefined,
      ),
      productos: this.inconsistenciasService.listarPerdidasProductos({
        from: this.from || undefined,
        to: this.to || undefined,
        categoriaId: this.categoriaId || undefined,
        page: this.page,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortDir: this.sortDir,
      }),
    }).subscribe({
      next: ({ resumen, productos }: { resumen: PerdidasResumenResponse; productos: PagedResponse<PerdidasProductoItem> }) => {
        this.resumen = resumen;
        this.productos = productos.items ?? [];
        this.totalItems = productos.meta?.totalItems ?? 0;
        this.totalPages = Math.max(1, productos.meta?.totalPages ?? 1);
      },
      error: (err: any) => {
        this.productos = [];
        const msg = err?.error?.message;
        this.errorMsg = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo cargar el módulo de pérdidas.');
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }

  loadCategorias() {
    this.loadingCategorias = true;
    this.categoriasService.list(true).subscribe({
      next: (items: InconsistenciaCategoria[]) => {
        this.categorias = items ?? [];
      },
      complete: () => {
        this.loadingCategorias = false;
      },
    });
  }

  money(value: number) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value ?? 0);
  }

  get fromItem() {
    if (this.totalItems === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toItem() {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }
}
