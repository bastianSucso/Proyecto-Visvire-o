import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InventarioDocumentoResumen, InventarioService } from '../../../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario-documentos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: 'inventario-documentos.page.html',
})
export class InventarioDocumentosPage {
  private inventarioService = inject(InventarioService);
  private router = inject(Router);

  documentos: InventarioDocumentoResumen[] = [];
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
    this.inventarioService.listarDocumentos(500).subscribe({
      next: (data) => {
        this.documentos = data ?? [];
        this.page = 1;
      },
      error: (err) => {
        this.errorMsg = err?.error?.message ?? 'No se pudieron cargar los documentos.';
      },
      complete: () => (this.loading = false),
    });
  }

  onSearchChange() {
    this.page = 1;
  }

  onPageSizeChange() {
    this.page = 1;
  }

  volver() {
    this.router.navigate(['/admin/inventario']);
  }

  private normalize(s: any) {
    return String(s ?? '').toLowerCase().trim();
  }

  get filtered(): InventarioDocumentoResumen[] {
    const term = this.normalize(this.q);
    if (!term) return this.documentos;

    return this.documentos.filter((d) => {
      const hay = [
        d.documentoRef,
        d.tipo,
        d.origen?.nombre,
        d.destino?.nombre,
        d.usuario?.email,
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

  get pageItems(): InventarioDocumentoResumen[] {
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

  first() { this.page = 1; }
  prev() { this.page = Math.max(1, this.page - 1); }
  next() { this.page = Math.min(this.totalPages, this.page + 1); }
  last() { this.page = this.totalPages; }
}
