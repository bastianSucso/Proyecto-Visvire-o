import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardOperativoHoyResponse, DashboardService } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.page.html',
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
