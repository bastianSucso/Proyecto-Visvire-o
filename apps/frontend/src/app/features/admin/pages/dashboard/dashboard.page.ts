import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardOperativoHoyResponse, DashboardService } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Dashboard operativo del dia</h1>
          <p class="text-slate-500 mt-1">Estado general del negocio (solo lectura).</p>
        </div>
        <button
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          [disabled]="loading"
          (click)="load()"
        >
          {{ loading ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </div>

      <div *ngIf="loading" class="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
        Cargando indicadores del dia...
      </div>

      <div *ngIf="!loading && errorMsg" class="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {{ errorMsg }}
      </div>

      <ng-container *ngIf="!loading && !errorMsg">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-slate-500 text-sm">Total ventas del dia</p>
            <p class="text-2xl font-semibold text-slate-900 mt-1">{{ money(data?.totalVentasDia) }}</p>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-slate-500 text-sm">Cantidad de ventas</p>
            <p class="text-2xl font-semibold text-slate-900 mt-1">{{ data?.cantidadVentasDia ?? 0 }}</p>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-slate-500 text-sm">Ganancia bruta del dia</p>
            <p class="text-2xl font-semibold text-slate-900 mt-1">{{ money(data?.gananciaBrutaDia) }}</p>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-slate-500 text-sm">Estado de caja</p>
            <p class="text-2xl font-semibold text-slate-900 mt-1">{{ cajaLabel(data?.estadoCaja) }}</p>
          </div>
        </div>

        <div class="mt-4 text-xs text-slate-500">
          Fecha negocio: {{ data?.fechaNegocio ?? '-' }} ({{ data?.timeZone ?? 'America/Santiago' }})
        </div>

        <div class="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <h2 class="text-lg font-semibold text-slate-900">Ocupacion actual</h2>
            <p class="text-sm text-slate-600">
              {{ data?.ocupacion?.habitacionesOcupadas ?? 0 }} / {{ data?.ocupacion?.habitacionesHabilitadas ?? 0 }}
              habitaciones ({{ porcentaje(data?.ocupacion?.porcentaje) }})
            </p>
          </div>

          <div class="mt-4" *ngIf="(data?.ocupacion?.detalle?.length ?? 0) === 0">
            <p class="text-sm text-slate-500">Sin registros de habitaciones ocupadas.</p>
          </div>

          <div class="mt-4 overflow-x-auto" *ngIf="(data?.ocupacion?.detalle?.length ?? 0) > 0">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-left text-slate-500">
                  <th class="py-2 pr-4 font-medium">Habitacion</th>
                  <th class="py-2 pr-4 font-medium">Huesped</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-slate-100" *ngFor="let item of data?.ocupacion?.detalle">
                  <td class="py-2 pr-4 text-slate-800">{{ item.habitacion }}</td>
                  <td class="py-2 pr-4 text-slate-700">{{ item.huespedNombreCompleto }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p class="text-sm text-slate-500">
            Costo de productos vendidos (COGS): {{ money(data?.costoProductosVendidosDia) }}
          </p>
          <p class="text-sm text-slate-500 mt-1">
            Costo de alojamiento (COGS): {{ money(data?.costoAlojamientoDia) }}
          </p>
          <p class="text-xs text-slate-400 mt-2">{{ data?.notaCogs }}</p>
        </div>

        <div class="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <h2 class="text-lg font-semibold text-slate-900">Ventas por dia</h2>
            <div class="flex items-center gap-2">
              <button
                class="rounded-lg border px-3 py-2 text-sm"
                [class]="selectedDias === 7 ? 'rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm text-white' : 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50'"
                [disabled]="loading"
                (click)="setDias(7)"
              >
                7 dias
              </button>
              <button
                class="rounded-lg border px-3 py-2 text-sm"
                [class]="selectedDias === 30 ? 'rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm text-white' : 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50'"
                [disabled]="loading"
                (click)="setDias(30)"
              >
                30 dias
              </button>
            </div>
          </div>
          <p class="mt-2 text-xs text-slate-500">Ultimos {{ data?.periodoVentasDias ?? selectedDias }} dias</p>

          <div *ngIf="ventasSerie.length === 0" class="mt-4 text-sm text-slate-500">Sin registros.</div>

          <div *ngIf="ventasSerie.length > 0" class="mt-4">
            <div class="h-64 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div class="flex items-start gap-2 mb-1">
                <div
                  class="flex-1 min-w-0 text-[9px] text-slate-500 text-center"
                  *ngFor="let item of ventasSerie"
                  [title]="money(item.totalVentas)"
                >
                  {{ moneyCompact(item.totalVentas) }}
                </div>
              </div>

              <div class="relative h-44 mt-1">
                <div class="absolute inset-0 pointer-events-none">
                  <div
                    *ngFor="let y of chartGridYPercent"
                    class="absolute left-0 right-0 border-t border-slate-200"
                    [style.top.%]="y"
                  ></div>
                </div>

                <div class="absolute inset-x-0 bottom-0 border-t border-slate-300"></div>

                <div class="relative h-full flex items-end gap-2">
                  <div class="flex-1 min-w-0 h-full flex items-end justify-center" *ngFor="let item of ventasSerie; let i = index">
                    <div
                      class="w-full max-w-8 rounded-t bg-blue-500/80 hover:bg-blue-500 transition-colors"
                      [style.height.%]="barHeightPercent(item.totalVentas)"
                      [title]="item.fecha + ' - ' + money(item.totalVentas)"
                    ></div>
                  </div>
                </div>
              </div>

              <div class="mt-2 flex items-start gap-2">
                <div class="flex-1 min-w-0 text-[10px] text-slate-500 text-center" *ngFor="let item of ventasSerie; let i = index">
                  {{ shouldRenderXAxisLabel(i, ventasSerie.length) ? shortDate(item.fecha) : '' }}
                </div>
              </div>
            </div>
            <p class="mt-2 text-xs text-slate-500">Eje Y: Total de ventas del dia | Eje X: Fecha</p>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class DashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  loading = false;
  errorMsg = '';
  data: DashboardOperativoHoyResponse | null = null;
  selectedDias: 7 | 30 = 7;

  ngOnInit(): void {
    this.load();
  }

  setDias(dias: 7 | 30) {
    if (this.selectedDias === dias) return;
    this.selectedDias = dias;
    this.load(dias);
  }

  load(dias: 7 | 30 = this.selectedDias) {
    this.loading = true;
    this.errorMsg = '';

    this.dashboardService.getOperativoHoy(dias).subscribe({
      next: (res) => {
        this.data = res;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo cargar el dashboard.');
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  get ventasSerie() {
    return this.data?.ventasPorDia ?? [];
  }

  get maxVentaSerie() {
    return this.ventasSerie.reduce((max, item) => Math.max(max, Number(item.totalVentas ?? 0)), 0);
  }

  get chartGridYPercent() {
    const lines = 5;
    return Array.from({ length: lines }, (_, i) => {
      const ratio = i / (lines - 1);
      return ratio * 100;
    });
  }

  barHeightPercent(total: string) {
    const n = Number(total ?? 0);
    const max = this.maxVentaSerie;
    if (!Number.isFinite(n) || n <= 0) return 2;
    if (max <= 0) return 2;
    return Math.max(2, (n / max) * 100);
  }

  shouldRenderXAxisLabel(index: number, total: number) {
    if (total <= 10) return true;
    if (total <= 20) return index % 2 === 0 || index === total - 1;
    return index % 4 === 0 || index === total - 1;
  }

  shortDate(yyyyMmDd: string) {
    const [yy, mm, dd] = yyyyMmDd.split('-');
    if (!yy || !mm || !dd) return yyyyMmDd;
    return `${dd}/${mm}`;
  }

  moneyCompact(value?: string | null) {
    const n = Number(value ?? 0);
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Number.isFinite(n) ? n : 0);
  }

  money(value?: string | null) {
    const n = Number(value ?? 0);
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
      Number.isFinite(n) ? n : 0,
    );
  }

  porcentaje(value?: number | null) {
    const n = Number(value ?? 0);
    const safe = Number.isFinite(n) ? n : 0;
    return `${safe.toFixed(2)}%`;
  }

  cajaLabel(estado?: string | null) {
    if (estado === 'ABIERTA') return 'Abierta';
    if (estado === 'CERRADA') return 'Cerrada';
    return 'Sin jornada';
  }
}
