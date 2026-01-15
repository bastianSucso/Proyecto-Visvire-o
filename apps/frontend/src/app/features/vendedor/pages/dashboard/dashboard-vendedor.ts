import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-vendedor-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p class="text-slate-500 mt-1">Resumen rápido del sistema.</p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="text-slate-500 text-sm">Historial</p>
          <p class="text-2xl font-semibold text-slate-900 mt-1">—</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="text-slate-500 text-sm">Caja</p>
          <p class="text-2xl font-semibold text-slate-900 mt-1">—</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="text-slate-500 text-sm">Ventas (próximo)</p>
          <p class="text-2xl font-semibold text-slate-900 mt-1">—</p>
        </div>
      </div>
    </div>
  `,
})
export class DashboarVendedordPage {}
