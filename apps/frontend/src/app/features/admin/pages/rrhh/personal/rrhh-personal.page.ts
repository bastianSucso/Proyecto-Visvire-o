import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActualizarTrabajadorDto, DocumentoTipo, RrhhService, Trabajador, TrabajadorEstado } from '../../../../../core/services/rrhh.service';

@Component({
  selector: 'app-rrhh-personal-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './rrhh-personal.page.html',
})
export class RrhhPersonalPage implements OnInit {
  private readonly rrhhService = inject(RrhhService);

  documentoTipos: DocumentoTipo[] = ['RUT', 'PASAPORTE', 'OTRO'];

  form: {
    nombres: string;
    apellidos: string;
    documentoTipo: DocumentoTipo;
    documentoNumero: string;
    telefono: string;
    email: string;
    cargo: string;
  } = {
    nombres: '',
    apellidos: '',
    documentoTipo: 'RUT',
    documentoNumero: '',
    telefono: '',
    email: '',
    cargo: '',
  };

  filters: {
    q: string;
    estado: '' | TrabajadorEstado;
  } = {
    q: '',
    estado: '',
  };

  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  createModalOpen = false;

  editModalOpen = false;
  editingTrabajador: Trabajador | null = null;
  editSaving = false;
  editErrorMsg = '';
  editForm: {
    nombres: string;
    apellidos: string;
    documentoTipo: DocumentoTipo;
    documentoNumero: string;
    telefono: string;
    email: string;
    cargo: string;
  } = {
    nombres: '',
    apellidos: '',
    documentoTipo: 'RUT',
    documentoNumero: '',
    telefono: '',
    email: '',
    cargo: '',
  };

  trabajadores: Trabajador[] = [];
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  ngOnInit(): void {
    this.load();
  }

  get totalItems() {
    return this.trabajadores.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): Trabajador[] {
    const start = (this.page - 1) * this.pageSize;
    return this.trabajadores.slice(start, start + this.pageSize);
  }

  get fromItem() {
    if (this.totalItems === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toItem() {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  onPageSizeChange() {
    this.page = 1;
  }

  onFiltersChange() {
    this.page = 1;
    this.load();
  }

  first() { this.page = 1; }
  prev() { this.page = Math.max(1, this.page - 1); }
  next() { this.page = Math.min(this.totalPages, this.page + 1); }
  last() { this.page = this.totalPages; }

  private clearForm() {
    this.form = {
      nombres: '',
      apellidos: '',
      documentoTipo: 'RUT',
      documentoNumero: '',
      telefono: '',
      email: '',
      cargo: '',
    };
  }

  private clearEditForm() {
    this.editForm = {
      nombres: '',
      apellidos: '',
      documentoTipo: 'RUT',
      documentoNumero: '',
      telefono: '',
      email: '',
      cargo: '',
    };
  }

  openCreateModal() {
    this.errorMsg = '';
    this.successMsg = '';
    this.clearForm();
    this.createModalOpen = true;
  }

  closeCreateModal() {
    this.createModalOpen = false;
    this.errorMsg = '';
    this.successMsg = '';
    this.clearForm();
  }

  crearTrabajador() {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.form.nombres.trim() || !this.form.apellidos.trim() || !this.form.documentoNumero.trim()) {
      this.errorMsg = 'Debes completar nombres, apellidos y documento.';
      return;
    }

    this.saving = true;
    this.rrhhService
      .crearTrabajador({
        nombres: this.form.nombres,
        apellidos: this.form.apellidos,
        documentoTipo: this.form.documentoTipo,
        documentoNumero: this.form.documentoNumero,
        telefono: this.form.telefono || undefined,
        email: this.form.email || undefined,
        cargo: this.form.cargo || undefined,
      })
      .subscribe({
        next: () => {
          this.successMsg = 'Trabajador registrado correctamente.';
          this.clearForm();
          this.createModalOpen = false;
          this.load();
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar trabajador.');
          this.saving = false;
        },
        complete: () => {
          this.saving = false;
        },
      });
  }

  openEditModal(row: Trabajador) {
    this.editingTrabajador = row;
    this.editErrorMsg = '';
    this.editForm = {
      nombres: row.nombres,
      apellidos: row.apellidos,
      documentoTipo: row.documentoTipo,
      documentoNumero: row.documentoNumero,
      cargo: row.cargo || '',
      telefono: row.telefono || '',
      email: row.email || '',
    };
    this.editModalOpen = true;
  }

  closeEditModal() {
    this.editModalOpen = false;
    this.editingTrabajador = null;
    this.editErrorMsg = '';
    this.clearEditForm();
  }

  saveEditTrabajador() {
    if (!this.editingTrabajador) return;

    if (!this.editForm.nombres.trim() || !this.editForm.apellidos.trim() || !this.editForm.documentoNumero.trim()) {
      this.editErrorMsg = 'Debes completar nombres, apellidos y documento.';
      return;
    }

    const dto: ActualizarTrabajadorDto = {
      nombres: this.editForm.nombres,
      apellidos: this.editForm.apellidos,
      documentoTipo: this.editForm.documentoTipo,
      documentoNumero: this.editForm.documentoNumero,
      cargo: this.editForm.cargo || undefined,
      telefono: this.editForm.telefono || undefined,
      email: this.editForm.email || undefined,
    };

    this.editSaving = true;
    this.rrhhService.actualizarTrabajador(this.editingTrabajador.id, dto).subscribe({
      next: () => {
        this.successMsg = 'Trabajador actualizado correctamente.';
        this.closeEditModal();
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.editErrorMsg = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo actualizar trabajador.');
        this.editSaving = false;
      },
      complete: () => {
        this.editSaving = false;
      },
    });
  }

  toggleEstado(row: Trabajador) {
    const siguienteEstado: TrabajadorEstado = row.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const confirmacion = window.confirm(
      siguienteEstado === 'INACTIVO'
        ? 'El trabajador quedara inactivo y no podra recibir nuevos pagos. Continuar?'
        : 'El trabajador sera reactivado para nuevos pagos. Continuar?',
    );
    if (!confirmacion) return;

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.rrhhService.setEstadoTrabajador(row.id, siguienteEstado).subscribe({
      next: () => {
        this.successMsg = `Trabajador ${siguienteEstado === 'ACTIVO' ? 'reactivado' : 'inactivado'} correctamente.`;
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorMsg = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo cambiar estado del trabajador.');
        this.saving = false;
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  load() {
    this.loading = true;
    this.rrhhService
      .listarTrabajadores({
        q: this.filters.q || undefined,
        estado: this.filters.estado || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.trabajadores = rows;
          this.page = 1;
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo cargar personal.');
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }
}
