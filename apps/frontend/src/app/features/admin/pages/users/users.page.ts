import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UsersService, UserDto } from '../../../../core/services/users.service';
import { UserRole } from '../../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: 'users.page.html',
})
export class UsersPage {
  private usersApi = inject(UsersService);
  private fb = inject(FormBuilder);

  users: UserDto[] = [];
  loading = false;
  errorMsg = '';

  // modal state
  modalOpen = false;
  editing: UserDto | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    nombre: [''],
    apellido: [''],
    role: ['VENDEDOR' as UserRole, [Validators.required]],
    password: [''], // requerido solo al crear
  });

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.errorMsg = '';
    this.usersApi.list().subscribe({
      next: (u) => (this.users = u),
      error: (e) => (this.errorMsg = e?.error?.message || 'Error al cargar usuarios'),
      complete: () => (this.loading = false),
    });
  }

  openCreate() {
    this.editing = null;
    this.form.reset({ role: 'VENDEDOR' as UserRole });
    this.modalOpen = true;
  }

  openEdit(u: UserDto) {
    this.editing = u;
    this.form.reset({
      email: u.email,
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      role: u.role,
      password: '',
    });
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.errorMsg = '';
  }

  save() {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const payload: any = {
      email: v.email!,
      nombre: v.nombre || undefined,
      apellido: v.apellido || undefined,
      role: v.role!,
    };

    if (!this.editing) {
      if (!v.password) {
        this.errorMsg = 'La contraseña es obligatoria al crear usuario.';
        return;
      }
      payload.password = v.password;
      this.usersApi.create(payload).subscribe({
        next: () => { this.closeModal(); this.refresh(); },
        error: (e) => (this.errorMsg = e?.error?.message || 'Error al crear usuario'),
      });
      return;
    }

    // edición: password opcional
    if (v.password) payload.password = v.password;

    this.usersApi.update(this.editing.id, payload).subscribe({
      next: () => { this.closeModal(); this.refresh(); },
      error: (e) => (this.errorMsg = e?.error?.message || 'Error al actualizar usuario'),
    });
  }

  toggleActive(u: UserDto) {
    this.usersApi.setActive(u.id, !u.isActive).subscribe({
      next: () => this.refresh(),
      error: (e) => alert(e?.error?.message || 'No se pudo actualizar estado'),
    });
  }
}
