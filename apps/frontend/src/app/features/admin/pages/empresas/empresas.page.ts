import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmpresaDto, EmpresasService } from '../../../../core/services/empresas.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './empresas.page.html',
})
export class EmpresasPage {
  private empresasApi = inject(EmpresasService);
  private fb = inject(FormBuilder);

  empresas: EmpresaDto[] = [];
  loading = false;
  errorMsg = '';

  q = '';
  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  modalOpen = false;
  editing: EmpresaDto | null = null;

  form = this.fb.group({
    rutEmpresa: ['', [Validators.required, Validators.maxLength(30)]],
    nombreEmpresa: ['', [Validators.required, Validators.maxLength(120)]],
    nombreContratista: ['', [Validators.maxLength(120)]],
    correoContratista: ['', [Validators.email, Validators.maxLength(160)]],
    fonoContratista: ['', [Validators.maxLength(30)]],
  });

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.errorMsg = '';
    this.empresasApi.list().subscribe({
      next: (items) => {
        this.empresas = items ?? [];
        this.page = 1;
      },
      error: (e) => (this.errorMsg = e?.error?.message || 'Error al cargar empresas'),
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

  get filtered(): EmpresaDto[] {
    const term = this.normalize(this.q);
    if (!term) return this.empresas;
    return this.empresas.filter((e) => {
      const hay = [
        e.rutEmpresa,
        e.nombreEmpresa,
        e.nombreContratista,
        e.correoContratista,
        e.fonoContratista,
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

  get pageItems() {
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
    this.editing = null;
    this.errorMsg = '';
    this.form.reset({
      rutEmpresa: '',
      nombreEmpresa: '',
      nombreContratista: '',
      correoContratista: '',
      fonoContratista: '',
    });
    this.modalOpen = true;
  }

  openEdit(e: EmpresaDto) {
    this.editing = e;
    this.errorMsg = '';
    this.form.reset({
      rutEmpresa: e.rutEmpresa,
      nombreEmpresa: e.nombreEmpresa,
      nombreContratista: e.nombreContratista ?? '',
      correoContratista: e.correoContratista ?? '',
      fonoContratista: e.fonoContratista ?? '',
    });
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.errorMsg = '';
  }

  save() {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const payload = {
      rutEmpresa: (v.rutEmpresa ?? '').trim(),
      nombreEmpresa: (v.nombreEmpresa ?? '').trim(),
      nombreContratista: (v.nombreContratista ?? '').trim() || undefined,
      correoContratista: (v.correoContratista ?? '').trim() || undefined,
      fonoContratista: (v.fonoContratista ?? '').trim() || undefined,
    };

    if (!this.editing) {
      this.empresasApi.create(payload).subscribe({
        next: () => {
          this.closeModal();
          this.refresh();
        },
        error: (e) => (this.errorMsg = e?.error?.message || 'Error al crear empresa'),
      });
      return;
    }

    this.empresasApi.update(this.editing.id, payload).subscribe({
      next: () => {
        this.closeModal();
        this.refresh();
      },
      error: (e) => (this.errorMsg = e?.error?.message || 'Error al actualizar empresa'),
    });
  }

  remove(e: EmpresaDto) {
    const ok = confirm(`¿Eliminar empresa ${e.nombreEmpresa}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    this.empresasApi.delete(e.id).subscribe({
      next: () => this.refresh(),
      error: (err) => (this.errorMsg = err?.error?.message || 'No se pudo eliminar la empresa'),
    });
  }
}
