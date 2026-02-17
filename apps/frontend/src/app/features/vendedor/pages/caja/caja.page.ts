import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CajaActualResponse, CajaResumenResponse, CajaService } from '../../../../core/services/caja.service';
import { ProductosService, Producto } from '../../../../core/services/productos.service';
import { Router } from '@angular/router';
import { IncidenciasService, IncidenciaTipo } from '../../../../core/services/incidencias.service';
import { VentaListItem, VentasService } from '../../../../core/services/ventas.service';
import {
  AlojamientoService,
  VentaAlojamientoTurnoItem,
} from '../../../../core/services/alojamiento.service';
import { forkJoin } from 'rxjs';

  type CajaFisica = {
    idCaja: number;
    numero: string;
    activa: boolean;
  };

@Component({
  selector: 'app-caja-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './caja.page.html',
})
export class CajaPage implements OnInit {
  cajaActual: CajaActualResponse | null = null;
  resumen: CajaResumenResponse | null = null;
  resumenLoading = false;
  resumenError = '';
  loading = false;
  errorMsg = '';

  // productos (para vendedor)
  productos: Producto[] = [];
  productosLoading = false;
  productosError = '';
  filtro = '';

  // incidencia
  incidenciaMsg = '';
  incidenciaError = '';
  incidenciaLoading = false;

  //nueva venta
  creandoVenta = false;
  ventaError = '';

  ventas: VentaListItem[] = [];
  ventasAlojamiento: VentaAlojamientoTurnoItem[] = [];
  ventasLoading = false;
  ventasError = '';

  form!: FormGroup;
  incidenciaForm!: FormGroup;

  cajas: CajaFisica[] = [];
  cajasLoading = false;
  cajasError = '';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private cajaService: CajaService,
    private productosService: ProductosService,
    private incidenciaService: IncidenciasService,
    private ventasService: VentasService,
    private alojamientoService: AlojamientoService,
  ) {
    this.form = this.fb.group({
      cajaId: [null],
      montoInicial: [0, [Validators.required, Validators.min(0)]],
    });

    this.incidenciaForm = this.fb.group({
      productoId: ['', [Validators.required]],
      tipo: ['FALTANTE' as IncidenciaTipo, [Validators.required]],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      observacion: [''],
    });
  }

  private toNumberMoney(v: unknown): number {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  get cajaAbierta(): boolean {
    return this.cajaActual?.sesionCaja.estado === 'ABIERTA';
  }
  
  get ventasEnEdicion(): VentaListItem[] {
    return this.ventas.filter(v => v.estado === 'EN_EDICION');
  }
  get ventasConfirmadas(): VentaListItem[] {
    return this.ventas.filter(v => v.estado === 'CONFIRMADA');
  }
  get ventasConfirmadasTurno(): VentaListItem[] {
    return (this.ventas ?? []).filter(v => v.estado === 'CONFIRMADA');
  }

  get confirmadasTurnoItems() {
    const ventas = (this.ventasConfirmadas ?? []).map((v) => ({
      tipo: 'VENTA' as const,
      idRef: v.idVenta,
      titulo: `Venta #${v.idVenta}`,
      detalle: `${v.cantidadTotal} ítems`,
      total: this.toNumberMoney(v.totalVenta),
      fecha: new Date(v.fechaConfirmacion ?? v.fechaCreacion),
    }));

    const alojamientos = (this.ventasAlojamiento ?? []).map((v) => ({
      tipo: 'ALOJAMIENTO' as const,
      idRef: v.idVentaAlojamiento,
      titulo: `Alojamiento #${v.idVentaAlojamiento}`,
      detalle: `${v.asignacion.habitacion.identificador} · ${v.asignacion.huesped.nombreCompleto}`,
      total: this.toNumberMoney(v.montoTotal),
      fecha: new Date(v.fechaConfirmacion),
    }));

    return [...ventas, ...alojamientos].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  get totalVentasCLP(): number {
    if (this.resumen) return this.toNumberMoney(this.resumen.totalVentas);
    return this.ventasConfirmadasTurno.reduce((acc, v) => acc + this.toNumberMoney(v.totalVenta), 0);
  }

  get totalEfectivoCLP(): number {
    if (this.resumen) return this.toNumberMoney(this.resumen.totalEfectivo);
    return this.ventasConfirmadasTurno
      .filter(v => v.medioPago === 'EFECTIVO')
      .reduce((acc, v) => acc + this.toNumberMoney(v.totalVenta), 0);
  }

  get totalTarjetaCLP(): number {
    if (this.resumen) return this.toNumberMoney(this.resumen.totalTarjeta);
    return this.ventasConfirmadasTurno
      .filter(v => v.medioPago === 'TARJETA')
      .reduce((acc, v) => acc + this.toNumberMoney(v.totalVenta), 0);
  }

  get montoInicialCLP(): number {
    return this.toNumberMoney(this.cajaActual?.sesionCaja.montoInicial);
  }

  get montoTotalCajaCLP(): number {
    if (this.resumen) return this.toNumberMoney(this.resumen.montoTotalCaja);
    return this.montoInicialCLP + this.totalEfectivoCLP;
  }

  get cantidadVentasTurno(): number {
    if (this.resumen) return this.resumen.cantidadVentas;
    return this.ventasConfirmadasTurno.length;
  }

  ngOnInit() {
    this.cargarCajaActual();
    this.cargarCajasFisicas();
  }

  cargarCajasFisicas() {
    this.cajasLoading = true;
    this.cajasError = '';

    this.cajaService.listarCajasFisicas(true).subscribe({
      next: (data) => (this.cajas = data ?? []),
      error: (err) => {
        this.cajasError = err?.error?.message ?? 'No se pudieron cargar cajas físicas.';
      },
      complete: () => (this.cajasLoading = false),
    });
  }

  cargarCajaActual() {
    this.loading = true;
    this.errorMsg = '';
    this.cajaService.cajaActual().subscribe({
      next: (res) => {
        this.cajaActual = res;
        this.loading = false;

        if (!this.cajaActual) {
          this.resumen = null;
          this.productos = [];
          this.ventas = [];
          this.ventasAlojamiento = [];
          return;
        }

        if (this.cajaActual?.sesionCaja.estado === 'ABIERTA') {
          this.cargarProductosSala();
          this.cargarVentasTurno();
          this.cargarResumenActual();
        } else {
          this.productos = [];
          this.ventas = [];
          this.ventasAlojamiento = [];
          this.cargarResumenSesion();
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message ?? 'Error al obtener estado de caja.';
      },
    });
  }

  cargarResumenActual() {
    this.resumenLoading = true;
    this.resumenError = '';
    this.cajaService.resumenActual().subscribe({
      next: (data) => (this.resumen = data),
      error: (err) => {
        this.resumen = null;
        this.resumenError = err?.error?.message ?? 'No se pudo cargar el resumen.';
      },
      complete: () => (this.resumenLoading = false),
    });
  }

  cargarResumenSesion() {
    const sesionCajaId = this.cajaActual?.sesionCaja.idSesionCaja;
    if (!sesionCajaId) return;
    this.resumenLoading = true;
    this.resumenError = '';
    this.cajaService.resumenSesion(sesionCajaId).subscribe({
      next: (data) => (this.resumen = data),
      error: (err) => {
        this.resumen = null;
        this.resumenError = err?.error?.message ?? 'No se pudo cargar el resumen.';
      },
      complete: () => (this.resumenLoading = false),
    });
  }

  abrirCaja() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    const rawCajaId = this.form.value.cajaId;
  

    const payload = {
      montoInicial: Number(this.form.value.montoInicial),
      cajaId: rawCajaId === null || rawCajaId === '' ? undefined : Number(rawCajaId),
    };

    this.cajaService.abrirCaja(payload).subscribe({
      next: (res) => {
        this.cajaActual = res;
        this.loading = false;

        if (this.cajaActual?.sesionCaja.estado === 'ABIERTA') {
          this.cargarProductosSala();
          this.cargarVentasTurno();
          this.cargarResumenActual();
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message ?? 'No se pudo abrir caja.';
      },
    });
  }


  cargarProductosSala() {
    this.productosLoading = true;
    this.productosError = '';
    this.productosService.list(false).subscribe({
      next: (data) => {

        this.productos = data;
      },
      error: (err) => {
        this.productosError = err?.error?.message ?? 'No se pudieron cargar productos.';
      },
      complete: () => {
        this.productosLoading = false;
      },
    });
  }

  get productosFiltrados(): Producto[] {
    const q = (this.filtro || '').trim().toLowerCase();
    if (!q) return this.productos;

    return this.productos.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const code = (p.internalCode || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      return name.includes(q) || code.includes(q) || barcode.includes(q);
    });
  }

  seleccionarProducto(p: Producto) {
    this.incidenciaForm.patchValue({ productoId: p.id });
  }

  irAProductosSala() {
    const sesionCajaId = this.cajaActual?.sesionCaja.idSesionCaja;
    this.router.navigate(['/pos/productos-sala'], {
      queryParams: { sesionCajaId: this.cajaActual?.sesionCaja.idSesionCaja},
    });
  }

  registrarIncidencia() {
    this.incidenciaMsg = '';
    this.incidenciaError = '';

    if (!this.cajaActual?.sesionCaja.idSesionCaja) {
      this.incidenciaError = 'No hay historial activo asociado a la caja.';
      return;
    }

    if (this.incidenciaForm.invalid) {
      this.incidenciaForm.markAllAsTouched();
      return;
    }

    this.incidenciaLoading = true;

    const v = this.incidenciaForm.value;

    const payload = {
      sesionCajaId: this.cajaActual.sesionCaja.idSesionCaja,
      productoId: String(v.productoId),
      tipo: v.tipo as IncidenciaTipo,
      cantidad: Number(v.cantidad),
      observacion: (v.observacion ?? '').trim() || undefined,
    };

    this.incidenciaService.crearIncidencia(payload).subscribe({
      next: () => {
        this.incidenciaMsg = 'Incidencia registrada correctamente.';
        this.incidenciaForm.patchValue({ cantidad: 1, observacion: '' });
        this.incidenciaLoading = false;
      },
      error: (err) => {
        this.incidenciaLoading = false;
        const msg = err?.error?.message;
        this.incidenciaError = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar la incidencia.');
      },
    });
  }

  nuevaVenta() {
    this.ventaError = '';

    if (!this.cajaAbierta) {
      this.ventaError = 'No se puede crear una venta si la caja no está abierta.';
      return;
    }

    this.creandoVenta = true;

    this.ventasService.crearVenta().subscribe({
      next: (venta) => {
        this.creandoVenta = false;
        this.router.navigate(['/pos/ventas', venta.idVenta]);
      },
      error: (err) => {
        this.creandoVenta = false;
        this.ventaError = err?.error?.message ?? 'No se pudo crear la venta.';
      },
    });
  }

  irAAlojamiento() {
    this.router.navigate(['/pos/alojamiento']);
  }

  cargarVentasTurno() {
    const sesionCajaId = this.cajaActual?.sesionCaja.idSesionCaja;
    if (!sesionCajaId) return;

    this.ventasLoading = true;
    this.ventasError = '';

    forkJoin({
      ventas: this.ventasService.listar(sesionCajaId),
      alojamientos: this.alojamientoService.listVentasAlojamientoSesion(sesionCajaId),
    }).subscribe({
      next: ({ ventas, alojamientos }) => {
        this.ventas = ventas ?? [];
        this.ventasAlojamiento = alojamientos ?? [];
      },
      error: (err) => {
        this.ventasError = err?.error?.message ?? 'No se pudieron cargar las ventas del turno.';
      },
      complete: () => (this.ventasLoading = false),
    });
  }

  cerrarCaja() {
    this.ventaError = '';
    this.resumenError = '';
    if (!this.cajaAbierta) {
      this.ventaError = 'No hay caja abierta para cerrar.';
      return;
    }
    if (this.ventasEnEdicion.length > 0) {
      this.ventaError = 'No se puede cerrar caja con ventas en edición.';
      return;
    }

    this.loading = true;
    this.cajaService.cerrarCaja().subscribe({
      next: (resumen) => {
        this.resumen = resumen;
        this.cargarCajaActual();
      },
      error: (err) => {
        this.loading = false;
        this.ventaError = err?.error?.message ?? 'No se pudo cerrar la caja.';
      },
      complete: () => (this.loading = false),
    });
  }
  
  continuarVenta(idVenta: number) {
    this.router.navigate(['/pos/ventas', idVenta]);
  }

  verVenta(idVenta: number) {
    this.router.navigate(['/pos/ventas', idVenta]); 
  }

  eliminarVentaEnEdicion(idVenta: number) {
    if (!this.cajaAbierta) return;

    const ok = window.confirm(`¿Seguro que deseas eliminar la Venta #${idVenta}?\n\nEsta acción no se puede deshacer.`);
    if (!ok) return;

    this.ventaError = '';

    this.ventasService.eliminarVenta(idVenta).subscribe({
      next: () => {
        this.cargarVentasTurno();
      },
      error: (err) => {
        this.ventaError = err?.error?.message ?? 'No se pudo eliminar la venta.';
      }
    });
  }


}
