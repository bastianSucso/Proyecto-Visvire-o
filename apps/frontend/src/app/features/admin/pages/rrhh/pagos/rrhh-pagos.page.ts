import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MetodoPagoFinanciero } from '../../../../../core/services/finanzas.service';
import { PagoPersonal, RrhhService, Trabajador } from '../../../../../core/services/rrhh.service';

@Component({
  selector: 'app-rrhh-pagos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './rrhh-pagos.page.html',
})
export class RrhhPagosPage implements OnInit {
  private readonly rrhhService = inject(RrhhService);

  metodosPago: MetodoPagoFinanciero[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO'];

  trabajadores: Trabajador[] = [];
  trabajadoresActivos: Trabajador[] = [];
  pagos: PagoPersonal[] = [];

  form: {
    trabajadorId: string;
    monto: number | null;
    fechaPago: string;
    concepto: string;
    descripcion: string;
    metodoPago: MetodoPagoFinanciero | '';
    referencia: string;
    adjuntoUrl: string;
  } = {
    trabajadorId: '',
    monto: null,
    fechaPago: '',
    concepto: 'SUELDO',
    descripcion: '',
    metodoPago: '',
    referencia: '',
    adjuntoUrl: '',
  };

  filters: {
    from: string;
    to: string;
    trabajadorId: string;
  } = {
    from: '',
    to: '',
    trabajadorId: '',
  };

  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  createModalOpen = false;

  editModalOpen = false;
  editingPago: PagoPersonal | null = null;
  editSaving = false;
  editErrorMsg = '';
  editForm: {
    monto: number | null;
    fechaPago: string;
    concepto: string;
    descripcion: string;
    metodoPago: MetodoPagoFinanciero | '';
    referencia: string;
    adjuntoUrl: string;
    motivo: string;
  } = {
    monto: null,
    fechaPago: '',
    concepto: '',
    descripcion: '',
    metodoPago: '',
    referencia: '',
    adjuntoUrl: '',
    motivo: '',
  };

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  anularModalOpen = false;
  pagoToAnular: PagoPersonal | null = null;
  anularSaving = false;
  anularErrorMsg = '';
  anularMotivo = '';

  ngOnInit(): void {
    this.loadTrabajadores();
    this.loadPagos();
  }

  get totalItems() {
    return this.pagos.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): PagoPersonal[] {
    const start = (this.page - 1) * this.pageSize;
    return this.pagos.slice(start, start + this.pageSize);
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
    this.loadPagos();
  }

  first() { this.page = 1; }
  prev() { this.page = Math.max(1, this.page - 1); }
  next() { this.page = Math.min(this.totalPages, this.page + 1); }
  last() { this.page = this.totalPages; }

  private clearForm() {
    this.form = {
      trabajadorId: '',
      monto: null,
      fechaPago: '',
      concepto: 'SUELDO',
      descripcion: '',
      metodoPago: '',
      referencia: '',
      adjuntoUrl: '',
    };
  }

  private clearEditForm() {
    this.editForm = {
      monto: null,
      fechaPago: '',
      concepto: '',
      descripcion: '',
      metodoPago: '',
      referencia: '',
      adjuntoUrl: '',
      motivo: '',
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

  loadTrabajadores() {
    this.rrhhService.listarTrabajadores().subscribe({
      next: (rows) => {
        this.trabajadores = rows;
        this.trabajadoresActivos = rows.filter((r) => r.estado === 'ACTIVO');
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar trabajadores.';
      },
    });
  }

  private toIsoWithCurrentLocalTime(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const now = new Date();
    return new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    ).toISOString();
  }

  private toIsoWithLocalTimeFromReference(dateKey: string, referenceIso: string) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const ref = new Date(referenceIso);
    return new Date(
      year,
      month - 1,
      day,
      ref.getHours(),
      ref.getMinutes(),
      ref.getSeconds(),
      ref.getMilliseconds(),
    ).toISOString();
  }

  private getListPagosFilters() {
    const hasFullDateRange = !!this.filters.from && !!this.filters.to;

    return {
      from: hasFullDateRange ? this.filters.from : undefined,
      to: hasFullDateRange ? this.filters.to : undefined,
      trabajadorId: this.filters.trabajadorId || undefined,
    };
  }

  private getEditFechaPagoPayload() {
    if (!this.editingPago) return undefined;
    if (!this.editForm.fechaPago) return undefined;

    const currentDate = this.editingPago.fechaPago?.slice(0, 10) || '';
    if (this.editForm.fechaPago === currentDate) return undefined;

    return this.toIsoWithLocalTimeFromReference(this.editForm.fechaPago, this.editingPago.fechaPago);
  }

  crearPago() {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.form.trabajadorId) {
      this.errorMsg = 'Debes seleccionar trabajador activo.';
      return;
    }
    if (!this.form.monto || this.form.monto <= 0) {
      this.errorMsg = 'El monto debe ser mayor a 0.';
      return;
    }
    if (!this.form.concepto.trim()) {
      this.errorMsg = 'Debes ingresar un concepto.';
      return;
    }

    this.saving = true;
    this.rrhhService
      .crearPago({
        trabajadorId: this.form.trabajadorId,
        monto: this.form.monto,
        fechaPago: this.form.fechaPago ? this.toIsoWithCurrentLocalTime(this.form.fechaPago) : undefined,
        concepto: this.form.concepto,
        descripcion: this.form.descripcion || undefined,
        metodoPago: this.form.metodoPago || undefined,
        referencia: this.form.referencia || undefined,
        adjuntoUrl: this.form.adjuntoUrl || undefined,
      })
      .subscribe({
        next: () => {
          this.successMsg = 'Pago registrado correctamente.';
          this.clearForm();
          this.createModalOpen = false;
          this.loadPagos();
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar el pago.');
          this.saving = false;
        },
        complete: () => {
          this.saving = false;
        },
      });
  }

  openEditModal(row: PagoPersonal) {
    this.editingPago = row;
    this.editErrorMsg = '';
    this.editForm = {
      monto: row.monto,
      fechaPago: row.fechaPago?.slice(0, 10) || '',
      concepto: row.concepto,
      descripcion: row.descripcion || '',
      metodoPago: row.metodoPago || '',
      referencia: row.referencia || '',
      adjuntoUrl: row.adjuntoUrl || '',
      motivo: '',
    };
    this.editModalOpen = true;
  }

  closeEditModal() {
    this.editModalOpen = false;
    this.editingPago = null;
    this.editErrorMsg = '';
    this.clearEditForm();
  }

  saveEditPago() {
    if (!this.editingPago) return;

    if (!this.editForm.monto || this.editForm.monto <= 0) {
      this.editErrorMsg = 'El monto debe ser mayor a 0.';
      return;
    }
    if (!this.editForm.concepto.trim()) {
      this.editErrorMsg = 'Debes ingresar un concepto.';
      return;
    }
    if (!this.editForm.motivo.trim()) {
      this.editErrorMsg = 'El motivo es obligatorio para modificar pagos.';
      return;
    }

    this.editSaving = true;
    const fechaPagoPayload = this.getEditFechaPagoPayload();

    this.rrhhService
      .actualizarPago(this.editingPago.id, {
        motivo: this.editForm.motivo,
        monto: this.editForm.monto,
        fechaPago: fechaPagoPayload,
        concepto: this.editForm.concepto,
        descripcion: this.editForm.descripcion || undefined,
        metodoPago: this.editForm.metodoPago || undefined,
        referencia: this.editForm.referencia || undefined,
        adjuntoUrl: this.editForm.adjuntoUrl || undefined,
      })
      .subscribe({
        next: () => {
          this.successMsg = 'Pago actualizado correctamente.';
          this.closeEditModal();
          this.loadPagos();
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.editErrorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo actualizar el pago.');
          this.editSaving = false;
        },
        complete: () => {
          this.editSaving = false;
        },
      });
  }

  openAnularModal(row: PagoPersonal) {
    this.pagoToAnular = row;
    this.anularErrorMsg = '';
    this.anularMotivo = '';
    this.anularModalOpen = true;
  }

  closeAnularModal() {
    this.anularModalOpen = false;
    this.pagoToAnular = null;
    this.anularErrorMsg = '';
    this.anularMotivo = '';
  }

  confirmAnularPago() {
    if (!this.pagoToAnular) return;

    this.anularSaving = true;
    this.rrhhService
      .anularPago(this.pagoToAnular.id, { motivo: this.anularMotivo || undefined })
      .subscribe({
        next: () => {
          this.successMsg = 'Pago anulado correctamente.';
          this.closeAnularModal();
          this.loadPagos();
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.anularErrorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo anular el pago.');
          this.anularSaving = false;
        },
        complete: () => {
          this.anularSaving = false;
        },
      });
  }

  loadPagos() {
    this.loading = true;
    this.rrhhService
      .listarPagos(this.getListPagosFilters())
      .subscribe({
        next: (rows) => {
          this.pagos = rows;
          this.page = 1;
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudieron cargar pagos.');
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  money(value: number) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value ?? 0);
  }
}
