import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UbicacionesService, Ubicacion } from '../../../../core/services/ubicaciones.service';

@Component({
  selector: 'app-bodegas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: 'bodegas.page.html',
})
export class BodegasPage {
  private fb = inject(FormBuilder);
  private ubicacionesService = inject(UbicacionesService);

  bodegas: Ubicacion[] = [];
  loading = false;
  errorMsg = '';

  q = '';
  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  isModalOpen = false;
  editing: Ubicacion | null = null;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.ubicacionesService.list('BODEGA', true).subscribe({
      next: (data) => {
        this.bodegas = data ?? [];
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

  private normalize(s: any) {
    return String(s ?? '').toLowerCase().trim();
  }

  get filtered(): Ubicacion[] {
    const term = this.normalize(this.q);
    if (!term) return this.bodegas;

    return this.bodegas.filter((b) => this.normalize(b.nombre).includes(term));
  }

  get totalItems() {
    return this.filtered.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): Ubicacion[] {
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

  openCreate() {
    this.errorMsg = '';
    this.editing = null;
    this.isModalOpen = true;
    this.form.reset({ nombre: '' });
    this.form.enable();
  }

  openEdit(b: Ubicacion) {
    this.errorMsg = '';
    this.editing = b;
    this.isModalOpen = true;
    this.form.reset({ nombre: b.nombre });
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
    const payload = { nombre: (v.nombre ?? '').trim() };

    this.loading = true;
    this.errorMsg = '';

    const req$ = this.editing
      ? this.ubicacionesService.update(this.editing.id, payload)
      : this.ubicacionesService.create({ ...payload, tipo: 'BODEGA' });

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

  toggleActive(b: Ubicacion) {
    this.ubicacionesService.update(b.id, { activa: !b.activa }).subscribe({
      next: () => this.load(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  remove(b: Ubicacion) {
    const ok = confirm(`¿Eliminar bodega "${b.nombre}"? Esta acción es irreversible.`);
    if (!ok) return;

    this.ubicacionesService.remove(b.id).subscribe({
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

    if (status === 409) return 'No se puede eliminar: la bodega tiene referencias. Desactívala.';
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}
