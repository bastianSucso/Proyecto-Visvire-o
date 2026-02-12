import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AlojamientoService, Habitacion } from '../../../../core/services/alojamiento.service';

type BedCount = { one: number; two: number; other: number };

@Component({
  selector: 'app-alojamiento-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './alojamiento.page.html',
})
export class AlojamientoPage implements OnInit {
  private alojamientoService = inject(AlojamientoService);

  availableRooms: Habitacion[] = [];

  filtro = '';
  page = 1;
  pageSize = 10;

  rangeFrom = '';
  rangeTo = '';

  loadingDisponibles = false;

  errorMsg = '';

  ngOnInit() {
    this.setDefaultRange();
    this.refreshDisponibles();
  }

  private setDefaultRange() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.rangeFrom = this.formatDatetimeLocal(now);
    this.rangeTo = this.formatDatetimeLocal(tomorrow);
  }

  private formatDatetimeLocal(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  onRangeChange() {
    this.refreshDisponibles();
  }

  refreshDisponibles() {
    if (!this.rangeFrom || !this.rangeTo) return;
    this.loadingDisponibles = true;
    this.alojamientoService.listDisponibles(this.rangeFrom, this.rangeTo).subscribe({
      next: (data) => {
        this.availableRooms = data ?? [];
        this.page = 1;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.setError(Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo consultar disponibilidad.'));
      },
      complete: () => (this.loadingDisponibles = false),
    });
  }


  get filteredRooms(): Habitacion[] {
    const q = (this.filtro || '').trim().toLowerCase();
    if (!q) return this.availableRooms;
    return this.availableRooms.filter((r) => {
      const ident = (r.identificador || '').toLowerCase();
      const comodidades = (r.comodidades ?? []).map((c) => c.nombre.toLowerCase()).join(' ');
      const camas = (r.camas ?? []).map((c) => c.item.toLowerCase()).join(' ');
      return ident.includes(q) || comodidades.includes(q) || camas.includes(q);
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRooms.length / this.pageSize));
  }

  get pageItems(): Habitacion[] {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredRooms.slice(start, end);
  }

  prevPage() {
    this.page = Math.max(1, this.page - 1);
  }

  nextPage() {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  bedCounts(room: Habitacion): BedCount {
    return (room.camas ?? []).reduce(
      (acc, cama) => {
        const name = (cama.item || '').toLowerCase();
        if (name.includes('1') || name.includes('1 plaza') || name.includes('1p')) acc.one += cama.cantidad;
        else if (name.includes('2') || name.includes('2 plaza') || name.includes('2p') || name.includes('matrimonial') || name.includes('doble')) acc.two += cama.cantidad;
        else acc.other += cama.cantidad;
        return acc;
      },
      { one: 0, two: 0, other: 0 } as BedCount,
    );
  }

  bedTotal(room: Habitacion) {
    return (room.camas ?? []).reduce((sum, c) => sum + (c.cantidad ?? 0), 0);
  }

  private setError(message: string) {
    this.errorMsg = message;
  }

  private clearMessages() {
    this.errorMsg = '';
  }
}
