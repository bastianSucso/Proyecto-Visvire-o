import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { InsumoGruposService, InsumoGrupo, InsumoGrupoStrategy } from '../../../../core/services/insumo-grupos.service';
import { ProductosService, Producto } from '../../../../core/services/productos.service';

@Component({
  selector: 'app-insumo-grupos-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgSelectModule],
  templateUrl: './insumo-grupos.page.html',
})
export class InsumoGruposPage {
  private fb = inject(FormBuilder);
  private gruposService = inject(InsumoGruposService);
  private productosService = inject(ProductosService);

  grupos: InsumoGrupo[] = [];
  productos: Producto[] = [];
  selectedGrupoId: string | null = null;
  selectedGrupo: InsumoGrupo | null = null;

  loading = false;
  errorMsg = '';
  successMsg = '';

  createForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    consumoStrategy: ['PRIORITY' as InsumoGrupoStrategy, [Validators.required]],
  });

  editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    consumoStrategy: ['PRIORITY' as InsumoGrupoStrategy, [Validators.required]],
    isActive: [true],
  });

  itemForm = this.fb.group({
    productoId: [null as string | null, [Validators.required]],
    priority: [null as number | null],
  });


  editPriority: Record<string, number | null> = {};
  editActive: Record<string, boolean> = {};

  ngOnInit() {
    this.loadProductos();
    this.loadGrupos();
  }

  loadProductos() {
    this.productosService.list(true).subscribe({
      next: (data) => {
        const all = data ?? [];
        this.productos = all.filter((p) => p.tipo === 'INSUMO');
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }

  loadGrupos() {
    this.loading = true;
    this.gruposService.list(true).subscribe({
      next: (data) => {
        this.grupos = data ?? [];
        this.syncSelected();
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
      complete: () => (this.loading = false),
    });
  }

  selectGrupo(id: string) {
    this.selectedGrupoId = id || null;
    this.syncSelected();
  }

  syncSelected() {
    if (!this.selectedGrupoId) {
      this.selectedGrupo = null;
      return;
    }
    this.selectedGrupo = this.grupos.find((g) => g.id === this.selectedGrupoId) ?? null;
    if (!this.selectedGrupo) return;
    this.editForm.reset({
      name: this.selectedGrupo.name,
      consumoStrategy: this.selectedGrupo.consumoStrategy,
      isActive: this.selectedGrupo.isActive,
    });
    this.editPriority = {};
    this.editActive = {};
    (this.selectedGrupo.items ?? []).forEach((it) => {
      this.editPriority[it.id] = it.priority ?? null;
      this.editActive[it.id] = it.isActive;
    });
  }

  crearGrupo() {
    this.successMsg = '';
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.value;
    this.gruposService
      .create({ name: String(v.name).trim(), consumoStrategy: v.consumoStrategy as InsumoGrupoStrategy })
      .subscribe({
        next: () => {
          this.successMsg = 'Grupo creado correctamente.';
          this.createForm.reset({ name: '', consumoStrategy: 'PRIORITY' });
          this.loadGrupos();
        },
        error: (err) => (this.errorMsg = this.mapError(err)),
      });
  }

  actualizarGrupo() {
    this.successMsg = '';
    if (!this.selectedGrupo) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;
    this.gruposService
      .update(this.selectedGrupo.id, {
        name: String(v.name).trim(),
        consumoStrategy: v.consumoStrategy as InsumoGrupoStrategy,
        isActive: Boolean(v.isActive),
      })
      .subscribe({
        next: () => {
          this.successMsg = 'Grupo actualizado correctamente.';
          this.loadGrupos();
        },
        error: (err) => (this.errorMsg = this.mapError(err)),
      });
  }

  agregarItem() {
    this.successMsg = '';
    if (!this.selectedGrupo) return;
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    const v = this.itemForm.value;
    this.gruposService
      .addItem(this.selectedGrupo.id, {
        productoId: String(v.productoId),
        priority: v.priority === null ? undefined : Number(v.priority),
      })
      .subscribe({
        next: () => {
          this.successMsg = 'Producto agregado al grupo.';
          this.itemForm.reset({ productoId: null, priority: null });
          this.loadGrupos();
        },
        error: (err) => (this.errorMsg = this.mapError(err)),
      });
  }

  actualizarItem(itemId: string) {
    this.successMsg = '';
    const priority = this.editPriority[itemId];
    const isActive = this.editActive[itemId];
    this.gruposService
      .updateItem(itemId, {
        priority: priority === undefined ? null : priority,
        isActive,
      })
      .subscribe({
        next: () => {
          this.successMsg = 'Producto actualizado.';
          this.loadGrupos();
        },
        error: (err) => (this.errorMsg = this.mapError(err)),
      });
  }

  eliminarItem(itemId: string) {
    this.successMsg = '';
    const ok = confirm('¿Eliminar este producto del grupo?');
    if (!ok) return;
    this.gruposService.removeItem(itemId).subscribe({
      next: () => {
        this.successMsg = 'Producto eliminado del grupo.';
        this.loadGrupos();
      },
      error: (err) => (this.errorMsg = this.mapError(err)),
    });
  }


  get strategyLabel(): string {
    if (!this.selectedGrupo) return '-';
    return this.selectedGrupo.consumoStrategy === 'PRIORITY' ? 'Prioridad' : 'Menor costo';
  }

  searchProducto(term: string, item: Producto) {
    const t = String(term ?? '').toLowerCase().trim();
    if (!t) return true;
    const hay = [item.name, item.internalCode, item.barcode, item.unidadBase]
      .map((x) => String(x ?? '').toLowerCase())
      .join(' ');
    return hay.includes(t);
  }

  private mapError(err: any): string {
    const status = err?.status;
    const msg = err?.error?.message;

    if (status === 409) return 'Conflicto al guardar. Revisa los datos.';
    if (status === 400) return 'Datos inválidos. Revisa los campos.';
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}
