import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UnidadMedida, UnidadesMedidaService } from '../../../../core/services/unidades-medida.service';

@Component({
  selector: 'app-unidades-medida-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './unidades-medida-modal.component.html',
})
export class UnidadesMedidaModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly unidadesService = inject(UnidadesMedidaService);

  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();

  unidades: UnidadMedida[] = [];
  loading = false;
  saving = false;
  errorMsg = '';

  editId: string | null = null;
  createForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(30)]],
  });
  editForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(30)]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      this.resetCreateForm();
      this.cancelEdit();
      this.load();
    }
  }

  close() {
    this.errorMsg = '';
    this.resetCreateForm();
    this.cancelEdit();
    this.closed.emit();
  }

  load() {
    this.loading = true;
    this.errorMsg = '';
    this.unidadesService.list(true).subscribe({
      next: (items: UnidadMedida[]) => {
        this.unidades = items ?? [];
      },
      error: (err: any) => {
        this.errorMsg = this.mapError(err, 'No se pudieron cargar las unidades.');
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  create() {
    const nombreCtrl = this.createForm.get('nombre');
    const nombre = String(nombreCtrl?.value ?? '').trim();
    if (!nombre) {
      nombreCtrl?.setErrors({ required: true });
      nombreCtrl?.markAsTouched();
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.unidadesService.create(nombre).subscribe({
      next: () => {
        this.resetCreateForm();
        this.changed.emit();
        this.load();
      },
      error: (err: any) => {
        this.errorMsg = this.mapError(err, 'No se pudo crear la unidad.');
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  onCreateEnter(event: Event) {
    event.preventDefault();
    if (!this.saving && this.createForm.valid) {
      this.create();
    }
  }

  startEdit(item: UnidadMedida) {
    this.editId = item.id;
    this.editForm.reset({ nombre: item.nombre });
  }

  cancelEdit() {
    this.editId = null;
    this.editForm.reset({ nombre: '' });
  }

  saveEdit(item: UnidadMedida) {
    const nombreCtrl = this.editForm.get('nombre');
    const nombre = String(nombreCtrl?.value ?? '').trim();
    if (!nombre) {
      nombreCtrl?.setErrors({ required: true });
      nombreCtrl?.markAsTouched();
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.unidadesService.updateNombre(item.id, nombre).subscribe({
      next: () => {
        this.cancelEdit();
        this.changed.emit();
        this.load();
      },
      error: (err: any) => {
        this.errorMsg = this.mapError(err, 'No se pudo actualizar la unidad.');
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  onEditEnter(event: Event, item: UnidadMedida) {
    event.preventDefault();
    if (!this.saving && this.editForm.valid) {
      this.saveEdit(item);
    }
  }

  toggleActive(item: UnidadMedida) {
    this.saving = true;
    this.errorMsg = '';
    this.unidadesService.setActive(item.id, !item.isActive).subscribe({
      next: () => {
        this.changed.emit();
        this.load();
      },
      error: (err: any) => {
        this.errorMsg = this.mapError(err, 'No se pudo actualizar el estado de la unidad.');
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  remove(item: UnidadMedida) {
    if (!item.canDelete) return;
    const ok = confirm(`¿Eliminar unidad "${item.nombre}"?`);
    if (!ok) return;

    this.saving = true;
    this.errorMsg = '';
    this.unidadesService.remove(item.id).subscribe({
      next: () => {
        this.changed.emit();
        this.load();
      },
      error: (err: any) => {
        this.errorMsg = this.mapError(err, 'No se pudo eliminar la unidad.');
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  private mapError(err: any, fallback: string) {
    const msg = err?.error?.message;
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? fallback);
  }

  private resetCreateForm() {
    this.createForm.reset({ nombre: '' });
  }
}
