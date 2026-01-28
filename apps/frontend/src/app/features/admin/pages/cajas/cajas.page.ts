import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CajasService, CajaFisica } from '../../../../core/services/cajas.service';

@Component({
  selector: 'app-cajas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: 'cajas.page.html',
})
export class CajasPage {
  private fb = inject(FormBuilder);
  private cajasService = inject(CajasService);

  cajas: CajaFisica[] = [];
  loading = false;
  errorMsg = '';

  q = '';
  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  isModalOpen = false;
  editing: CajaFisica | null = null;

  form = this.fb.group({
    numero: ['', [Validators.required, Validators.maxLength(30)]],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.cajasService.list(false).subscribe({
      next: (data) => {
        this.cajas = data ?? [];
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

  get filtered(): CajaFisica[] {
    const term = this.normalize(this.q);
    if (!term) return this.cajas;

    return this.cajas.filter((c) => this.normalize(c.numero).includes(term));
  }

  get totalItems() {
    return this.filtered.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): CajaFisica[] {
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
    this.form.reset({ numero: '' });
    this.form.enable();
  }

  openEdit(caja: CajaFisica) {
    this.errorMsg = '';
    this.editing = caja;
    this.isModalOpen = true;
    this.form.reset({ numero: caja.numero });
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
    const payload = { numero: (v.numero ?? '').trim() };

    this.loading = true;
    this.errorMsg = '';

    const req$ = this.editing
      ? this.cajasService.update(this.editing.idCaja, payload)
      : this.cajasService.create(payload);

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

  toggleActive(caja: CajaFisica) {
    this.cajasService.update(caja.idCaja, { activa: !caja.activa }).subscribe({
      next: () => this.load(),
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  remove(caja: CajaFisica) {
    const ok = confirm(`¿Eliminar caja "${caja.numero}"? Esta acción es irreversible.`);
    if (!ok) return;

    this.cajasService.remove(caja.idCaja).subscribe({
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

    if (status === 409) return 'No se puede eliminar: la caja tiene referencias. Desactívala.';
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}
