import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  InconsistenciaCategoria,
  InconsistenciasCategoriasService,
} from '../../../../../core/services/inconsistencias-categorias.service';

@Component({
  selector: 'app-inconsistencias-categorias-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './inconsistencias-categorias.page.html',
})
export class InconsistenciasCategoriasPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InconsistenciasCategoriasService);

  categorias: InconsistenciaCategoria[] = [];
  loading = false;
  errorMsg = '';

  q = '';
  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  isModalOpen = false;
  editing: InconsistenciaCategoria | null = null;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    descripcion: ['', [Validators.maxLength(300)]],
    orden: [0, [Validators.required, Validators.min(0), Validators.max(32767)]],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.api.list(true).subscribe({
      next: (data) => {
        this.categorias = data ?? [];
        this.page = 1;
      },
      error: (err) => {
        this.errorMsg = this.mapError(err);
        this.loading = false;
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

  private normalize(s: unknown) {
    return String(s ?? '').toLowerCase().trim();
  }

  get filtered(): InconsistenciaCategoria[] {
    const term = this.normalize(this.q);
    if (!term) return this.categorias;

    return this.categorias.filter(
      (c) => this.normalize(c.nombre).includes(term) || this.normalize(c.codigo).includes(term),
    );
  }

  get totalItems() {
    return this.filtered.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): InconsistenciaCategoria[] {
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

  openCreate() {
    this.errorMsg = '';
    this.editing = null;
    this.isModalOpen = true;
    this.form.reset({ nombre: '', descripcion: '', orden: 0 });
    this.form.enable();
  }

  openEdit(item: InconsistenciaCategoria) {
    this.errorMsg = '';
    this.editing = item;
    this.isModalOpen = true;
    this.form.reset({
      nombre: item.nombre,
      descripcion: item.descripcion ?? '',
      orden: item.orden,
    });
    this.form.enable();
  }

  closeModal() {
    this.isModalOpen = false;
    this.editing = null;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const payload = {
      nombre: String(v.nombre ?? '').trim(),
      descripcion: String(v.descripcion ?? '').trim() || undefined,
      orden: Number(v.orden ?? 0),
    };

    this.loading = true;
    this.errorMsg = '';

    const req$ = this.editing ? this.api.update(this.editing.id, payload) : this.api.create(payload);

    req$.subscribe({
      next: () => {
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.errorMsg = this.mapError(err);
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }

  toggleActive(item: InconsistenciaCategoria) {
    this.api.update(item.id, { activa: !item.activa }).subscribe({
      next: () => this.load(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  remove(item: InconsistenciaCategoria) {
    const ok = confirm(`¿Eliminar categoría "${item.nombre}"? Esta acción es irreversible.`);
    if (!ok) return;

    this.api.remove(item.id).subscribe({
      next: () => this.load(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  c(name: string) {
    return this.form.get(name);
  }

  private mapError(err: any): string {
    const status = err?.status;
    const msg = err?.error?.message;

    if (status === 409) {
      return 'No se puede eliminar: la categoría tiene referencias. Desactívala.';
    }
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}
