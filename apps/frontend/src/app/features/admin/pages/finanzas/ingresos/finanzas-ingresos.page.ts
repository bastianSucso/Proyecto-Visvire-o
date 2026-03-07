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
  template: `
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Finanzas · Ingresos externos</h1>
          <p class="text-slate-500 mt-1">Registro manual y consulta historica.</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <a class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50" routerLink="/admin/finanzas/resumen">Resumen</a>
        <a class="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm text-white" routerLink="/admin/finanzas/ingresos">Ingresos</a>
        <a class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50" routerLink="/admin/finanzas/egresos">Egresos</a>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <h2 class="text-lg font-semibold text-slate-900">Registrar ingreso externo</h2>

        <div *ngIf="errorMsg" class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ errorMsg }}
        </div>
        <div *ngIf="successMsg" class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {{ successMsg }}
        </div>

        <form class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3" (ngSubmit)="crearIngreso()">
          <label class="block">
            <span class="text-sm text-slate-700">Monto (CLP)</span>
            <input type="number" min="1" step="0.01" [(ngModel)]="form.monto" name="monto" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" required />
          </label>

          <label class="block">
            <span class="text-sm text-slate-700">Categoria</span>
            <input type="text" [(ngModel)]="form.categoria" name="categoria" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="OTROS" required />
          </label>

          <label class="block">
            <span class="text-sm text-slate-700">Metodo de pago (opcional)</span>
            <select [(ngModel)]="form.metodoPago" name="metodoPago" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              <option value="">No especificado</option>
              <option *ngFor="let m of metodosPago" [value]="m">{{ m }}</option>
            </select>
          </label>

          <label class="block">
            <span class="text-sm text-slate-700">Referencia (opcional)</span>
            <input type="text" [(ngModel)]="form.referencia" name="referencia" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>

          <label class="block">
            <span class="text-sm text-slate-700">Afecto a IVA debito</span>
            <select [(ngModel)]="form.aplicaCreditoFiscal" name="aplicaCreditoFiscal" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              <option [ngValue]="true">Si</option>
              <option [ngValue]="false">No</option>
            </select>
          </label>

          <label class="block md:col-span-2">
            <span class="text-sm text-slate-700">Descripcion / Observacion</span>
            <textarea [(ngModel)]="form.descripcion" name="descripcion" rows="3" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"></textarea>
          </label>

          <div class="md:col-span-2">
            <button type="submit" [disabled]="saving" class="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60">
              {{ saving ? 'Guardando...' : 'Guardar ingreso' }}
            </button>
          </div>
        </form>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <h2 class="text-lg font-semibold text-slate-900">Consulta historica</h2>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <label class="block">
            <span class="text-sm text-slate-700">Desde</span>
            <input type="date" [(ngModel)]="filters.from" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label class="block">
            <span class="text-sm text-slate-700">Hasta</span>
            <input type="date" [(ngModel)]="filters.to" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label class="block">
            <span class="text-sm text-slate-700">Categoria</span>
            <input type="text" [(ngModel)]="filters.categoria" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <div class="flex items-end gap-2">
            <button (click)="load()" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">Filtrar</button>
            <button (click)="clearFilters()" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">Limpiar</button>
          </div>
        </div>

        <div *ngIf="loading" class="mt-4 text-sm text-slate-500">Cargando ingresos...</div>
        <div *ngIf="!loading && ingresos.length === 0" class="mt-4 text-sm text-slate-500">Sin registros.</div>

        <div *ngIf="!loading && ingresos.length > 0" class="mt-4 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left text-slate-500">
                <th class="py-2 pr-4 font-medium">Fecha</th>
                <th class="py-2 pr-4 font-medium">Categoria</th>
                <th class="py-2 pr-4 font-medium">Monto</th>
                <th class="py-2 pr-4 font-medium">Metodo</th>
                <th class="py-2 pr-4 font-medium">Afecto IVA debito</th>
                <th class="py-2 pr-4 font-medium">Descripcion</th>
                <th class="py-2 pr-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of ingresos" class="border-b border-slate-100">
                <td class="py-2 pr-4 text-slate-800">{{ row.fechaMovimiento | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td class="py-2 pr-4 text-slate-700">{{ row.categoria }}</td>
                <td class="py-2 pr-4 text-slate-900 font-medium">{{ money(row.monto) }}</td>
                <td class="py-2 pr-4 text-slate-700">{{ row.metodoPago || '-' }}</td>
                <td class="py-2 pr-4 text-slate-700">{{ row.aplicaCreditoFiscal ? 'Si' : 'No' }}</td>
                <td class="py-2 pr-4 text-slate-700">{{ row.descripcion || '-' }}</td>
                <td class="py-2 pr-4">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                      (click)="editarIngreso(row)"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      class="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      (click)="eliminarIngreso(row)"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
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

  ingresos: MovimientoFinanciero[] = [];
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  ngOnInit(): void {
    this.load();
  }

  clearForm() {
    this.form = {
      monto: null,
      categoria: 'OTROS',
      descripcion: '',
      metodoPago: '',
      referencia: '',
      aplicaCreditoFiscal: false,
    };
  }

  editarIngreso(row: MovimientoFinanciero) {
    const montoRaw = window.prompt('Monto (CLP):', String(row.monto ?? ''));
    if (montoRaw === null) return;

    const monto = Number(montoRaw);
    if (!Number.isFinite(monto) || monto <= 0) {
      this.errorMsg = 'El monto debe ser mayor a 0.';
      return;
    }

    const categoria = window.prompt('Categoria:', row.categoria ?? '');
    if (categoria === null) return;

    const descripcion = window.prompt('Descripcion (opcional):', row.descripcion ?? '') ?? '';
    const referencia = window.prompt('Referencia (opcional):', row.referencia ?? '') ?? '';
    const aplicaCreditoRaw = window.prompt(
      'Afecto a IVA debito? (SI/NO):',
      row.aplicaCreditoFiscal ? 'SI' : 'NO',
    );
    if (aplicaCreditoRaw === null) return;

    const aplicaCreditoFiscal = aplicaCreditoRaw.trim().toUpperCase() === 'SI';

    const dto: ActualizarMovimientoManualDto = {
      monto,
      categoria,
      descripcion: descripcion || undefined,
      referencia: referencia || undefined,
      aplicaCreditoFiscal,
    };

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.finanzasService.actualizarMovimientoManual(row.id, dto).subscribe({
      next: () => {
        this.successMsg = 'Ingreso actualizado correctamente.';
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorMsg = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo actualizar el ingreso.');
        this.saving = false;
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  eliminarIngreso(row: MovimientoFinanciero) {
    const confirmar = window.confirm('Se anulara este ingreso manual. Esta accion no elimina fisicamente el registro.');
    if (!confirmar) return;

    const motivo = window.prompt('Motivo de anulacion (opcional):', '') ?? '';

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.finanzasService.anularMovimientoManual(row.id, motivo || undefined).subscribe({
      next: () => {
        this.successMsg = 'Ingreso anulado correctamente.';
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorMsg = Array.isArray(msg)
          ? msg.join(' | ')
          : (msg ?? 'No se pudo anular el ingreso.');
        this.saving = false;
      },
      complete: () => {
        this.saving = false;
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

  clearFilters() {
    this.filters = { from: '', to: '', categoria: '' };
    this.load();
  }

  load() {
    this.loading = true;
    this.finanzasService
      .listarIngresosExternos({
        from: this.filters.from || undefined,
        to: this.filters.to || undefined,
        categoria: this.filters.categoria || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.ingresos = rows;
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
