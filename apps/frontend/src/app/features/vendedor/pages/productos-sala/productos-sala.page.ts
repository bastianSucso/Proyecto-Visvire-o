import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ProductosService, Producto } from '../../../../core/services/productos.service';
import { RecetasService } from '../../../../core/services/recetas.service';
import { CajaService, CajaActualResponse } from '../../../../core/services/caja.service';
import { IncidenciasService, IncidenciaTipo } from '../../../../core/services/incidencias.service';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-productos-sala-page',
  standalone: true,
  imports: [NgIf, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: 'productos-sala.page.html',
})
export class ProductosSalaPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  private productosService = inject(ProductosService);
  private recetasService = inject(RecetasService);
  private cajaService = inject(CajaService);
  private incidenciaService = inject(IncidenciasService);

  // contexto de sesión caja (turno)
  sesionCajaId: number | null = null;
  cajaActual: CajaActualResponse | null = null;

  // lista productos
  productos: Producto[] = [];
  posiblesMap: Record<string, number> = {};
  loading = false;
  errorMsg = '';


  filtro = '';
  filtroTipo: 'TODOS' | 'REVENTA' | 'INSUMO' | 'COMIDA' = 'TODOS';

  // paginación
  page = 1;
  pageSize = 20;

  // modal incidencia
  modalOpen = false;
  selectedProducto: Producto | null = null;

  incidenciaLoading = false;
  incidenciaMsg = '';
  incidenciaError = '';

  incidenciaForm = this.fb.group({
    tipo: ['FALTANTE' as IncidenciaTipo, [Validators.required]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    observacion: [''],
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((qp) => {
      const raw = qp.get('sesionCajaId');
      this.sesionCajaId = raw ? Number(raw) : null;

      if (!this.sesionCajaId) {
        this.cargarCajaActualParaSesion();
      }
    });

    this.cargarProductos();
  }

  volverCaja() {
    this.router.navigate(['/pos/caja']);
  }

  cargarCajaActualParaSesion() {
    this.cajaService.cajaActual().subscribe({
      next: (res) => {
        this.cajaActual = res;
        this.sesionCajaId =
          res?.sesionCaja?.estado === 'ABIERTA' ? res?.sesionCaja?.idSesionCaja ?? null : null;
      },
      error: () => {
        // si falla, no bloqueamos la lista, pero no podrás registrar incidencia
      },
    });
  }

  cargarProductos() {
    this.loading = true;
    this.errorMsg = '';

    forkJoin({
      productos: this.productosService.listSala(),
      posibles: this.recetasService.posibles().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ productos, posibles }) => {
        this.productos = productos ?? [];
        this.posiblesMap = (posibles ?? []).reduce((acc, item) => {
          acc[item.comidaId] = item.posibles;
          return acc;
        }, {} as Record<string, number>);
        this.page = 1;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorMsg = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudieron cargar productos.');
      },
      complete: () => (this.loading = false),
    });
  }

  getPrecioParaProducto(producto: Producto) {
    return producto.precioVenta ?? null;
  }

  // ====== filtrado + paginación ======
  get productosFiltrados(): Producto[] {
    const q = (this.filtro || '').trim().toLowerCase();
    const base = this.filtroTipo === 'TODOS'
      ? this.productos
      : this.productos.filter((p) => p.tipo === (this.filtroTipo as any));

    if (!q) return base;

    return base.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const code = (p.internalCode || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      return name.includes(q) || code.includes(q) || barcode.includes(q);
    });
  }

  getTipoBadgeClass(producto: Producto) {
    const tipo = producto.tipo ?? '';
    if (tipo === 'INSUMO') return 'bg-blue-50 text-blue-700 ring-blue-200';
    if (tipo === 'REVENTA') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    if (tipo === 'COMIDA') return 'bg-amber-50 text-amber-700 ring-amber-200';
    return 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.productosFiltrados.length / this.pageSize));
  }

  get pageItems(): Producto[] {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.productosFiltrados.slice(start, end);
  }

  irPrimera() { this.page = 1; }
  irAnterior() { this.page = Math.max(1, this.page - 1); }
  irSiguiente() { this.page = Math.min(this.totalPages, this.page + 1); }
  irUltima() { this.page = this.totalPages; }

  // ====== incidencias ======
  abrirModalIncidencia(p: Producto) {
    this.selectedProducto = p;
    this.modalOpen = true;
    this.incidenciaMsg = '';
    this.incidenciaError = '';
    this.incidenciaForm.reset({
      tipo: 'FALTANTE',
      cantidad: 1,
      observacion: '',
    });
  }

  cerrarModal() {
    this.modalOpen = false;
    this.selectedProducto = null;
    this.incidenciaLoading = false;
  }

  registrarIncidencia() {
    this.incidenciaMsg = '';
    this.incidenciaError = '';

    if (!this.sesionCajaId) {
      this.incidenciaError = 'No hay una sesión activa. Vuelve a Caja y abre caja para iniciar la jornada.';
      return;
    }
    if (!this.selectedProducto) {
      this.incidenciaError = 'Producto no seleccionado.';
      return;
    }
    if (this.incidenciaForm.invalid) {
      this.incidenciaForm.markAllAsTouched();
      return;
    }

    this.incidenciaLoading = true;

    const v = this.incidenciaForm.value;
    const payload = {
      sesionCajaId: this.sesionCajaId,
      productoId: this.selectedProducto.id,
      tipo: v.tipo as IncidenciaTipo,
      cantidad: Number(v.cantidad),
      observacion: (v.observacion ?? '').trim() || undefined,
    };

    this.incidenciaService.crearIncidencia(payload).subscribe({
      next: () => {
        this.incidenciaMsg = 'Incidencia registrada correctamente.';
        this.incidenciaLoading = false;
      },
      error: (err) => {
        this.incidenciaLoading = false;
        const msg = err?.error?.message;
        this.incidenciaError = Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'No se pudo registrar la incidencia.');
      },
    });
  }

  c(name: string) {
    return this.incidenciaForm.get(name);
  }

  verIncidencias() {
    this.router.navigate(['/pos/incidencias'], { queryParams: { view: 'turno' } });
  }
}
