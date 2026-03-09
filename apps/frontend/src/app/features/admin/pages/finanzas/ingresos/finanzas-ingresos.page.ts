import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  ActualizarMovimientoManualDto,
  FinanzasService,
  MetodoPagoFinanciero,
  MovimientoFinanciero,
} from '../../../../../core/services/finanzas.service';

@Component({
  selector: 'app-finanzas-ingresos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './finanzas-ingresos.page.html',
})
export class FinanzasIngresosPage implements OnInit {
  private readonly finanzasService = inject(FinanzasService);

  metodosPago: MetodoPagoFinanciero[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO'];

  form: {
    monto: number | null;
    categoria: string;
    descripcion: string;
    metodoPago: MetodoPagoFinanciero | '';
    referencia: string;
    aplicaCreditoFiscal: boolean;
  } = {
    monto: null,
    categoria: 'OTROS',
    descripcion: '',
    metodoPago: '',
    referencia: '',
    aplicaCreditoFiscal: false,
  };

  filters = {
    from: '',
    to: '',
    categoria: '',
  };

  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];
  private filtersChangeTimer: ReturnType<typeof setTimeout> | null = null;

  createModalOpen = false;

  editModalOpen = false;
  editingIngreso: MovimientoFinanciero | null = null;
  editSaving = false;
  editErrorMsg = '';
  editForm: {
    monto: number | null;
    categoria: string;
    descripcion: string;
    metodoPago: MetodoPagoFinanciero | '';
    referencia: string;
    aplicaCreditoFiscal: boolean;
  } = {
    monto: null,
    categoria: '',
    descripcion: '',
    metodoPago: '',
    referencia: '',
    aplicaCreditoFiscal: false,
  };

  anularModalOpen = false;
  ingresoToAnular: MovimientoFinanciero | null = null;
  anularSaving = false;
  anularErrorMsg = '';
  anularMotivo = '';

  ingresos: MovimientoFinanciero[] = [];
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  ngOnInit(): void {
    this.load();
  }

  get totalItems() {
    return this.ingresos.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): MovimientoFinanciero[] {
    const start = (this.page - 1) * this.pageSize;
    return this.ingresos.slice(start, start + this.pageSize);
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

  first() { this.page = 1; }
  prev() { this.page = Math.max(1, this.page - 1); }
  next() { this.page = Math.min(this.totalPages, this.page + 1); }
  last() { this.page = this.totalPages; }

  onFiltersChange() {
    if (this.filtersChangeTimer) {
      clearTimeout(this.filtersChangeTimer);
    }

    this.filtersChangeTimer = setTimeout(() => {
      this.page = 1;
      this.load();
    }, 300);
  }

  private clearForm() {
    this.form = {
      monto: null,
      categoria: 'OTROS',
      descripcion: '',
      metodoPago: '',
      referencia: '',
      aplicaCreditoFiscal: false,
    };
  }

  private getListFilters() {
    const hasDateRange = !!this.filters.from && !!this.filters.to;

    return {
      from: hasDateRange ? this.filters.from : undefined,
      to: hasDateRange ? this.filters.to : undefined,
      categoria: this.filters.categoria.trim() || undefined,
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

  openEditModal(row: MovimientoFinanciero) {
    this.editingIngreso = row;
    this.editErrorMsg = '';
    this.editForm = {
      monto: row.monto,
      categoria: row.categoria,
      descripcion: row.descripcion || '',
      metodoPago: row.metodoPago || '',
      referencia: row.referencia || '',
      aplicaCreditoFiscal: !!row.aplicaCreditoFiscal,
    };
    this.editModalOpen = true;
  }

  closeEditModal() {
    this.editModalOpen = false;
    this.editingIngreso = null;
    this.editErrorMsg = '';
  }

  saveEditIngreso() {
    if (!this.editingIngreso) return;

    if (!this.editForm.monto || this.editForm.monto <= 0) {
      this.editErrorMsg = 'El monto debe ser mayor a 0.';
      return;
    }
    if (!this.editForm.categoria.trim()) {
      this.editErrorMsg = 'La categoria es obligatoria.';
      return;
    }

    const dto: ActualizarMovimientoManualDto = {
      monto: this.editForm.monto,
      categoria: this.editForm.categoria,
      descripcion: this.editForm.descripcion || undefined,
      metodoPago: this.editForm.metodoPago || undefined,
      referencia: this.editForm.referencia || undefined,
      aplicaCreditoFiscal: this.editForm.aplicaCreditoFiscal,
    };

    this.editSaving = true;
    this.finanzasService.actualizarMovimientoManual(this.editingIngreso.id, dto).subscribe({
      next: () => {
        this.successMsg = 'Ingreso actualizado correctamente.';
        this.closeEditModal();
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.editErrorMsg = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo actualizar el ingreso.');
        this.editSaving = false;
      },
      complete: () => {
        this.editSaving = false;
      },
    });
  }

  openAnularModal(row: MovimientoFinanciero) {
    this.ingresoToAnular = row;
    this.anularErrorMsg = '';
    this.anularMotivo = '';
    this.anularModalOpen = true;
  }

  closeAnularModal() {
    this.anularModalOpen = false;
    this.ingresoToAnular = null;
    this.anularErrorMsg = '';
    this.anularMotivo = '';
  }

  confirmAnularIngreso() {
    if (!this.ingresoToAnular) return;

    this.anularSaving = true;
    this.finanzasService
      .anularMovimientoManual(this.ingresoToAnular.id, this.anularMotivo || undefined)
      .subscribe({
        next: () => {
          this.successMsg = 'Ingreso anulado correctamente.';
          this.closeAnularModal();
          this.load();
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.anularErrorMsg = Array.isArray(msg)
            ? msg.join(' | ')
            : (msg ?? 'No se pudo anular el ingreso.');
          this.anularSaving = false;
        },
        complete: () => {
          this.anularSaving = false;
        },
      });
  }

  crearIngreso() {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.form.monto || this.form.monto <= 0) {
      this.errorMsg = 'El monto debe ser mayor a 0.';
      return;
    }

    this.saving = true;
    this.finanzasService
      .registrarIngresoExterno({
        monto: this.form.monto,
        categoria: this.form.categoria,
        descripcion: this.form.descripcion || undefined,
        metodoPago: this.form.metodoPago || undefined,
        referencia: this.form.referencia || undefined,
        aplicaCreditoFiscal: this.form.aplicaCreditoFiscal,
      })
      .subscribe({
        next: () => {
          this.successMsg = 'Ingreso registrado correctamente.';
          this.clearForm();
          this.createModalOpen = false;
          this.load();
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo guardar el ingreso.');
          this.saving = false;
        },
        complete: () => {
          this.saving = false;
        },
      });
  }

  load() {
    this.loading = true;
    this.finanzasService
      .listarIngresosExternos(this.getListFilters())
      .subscribe({
        next: (rows) => {
          this.ingresos = rows;
          this.page = 1;
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudieron cargar los ingresos.');
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
