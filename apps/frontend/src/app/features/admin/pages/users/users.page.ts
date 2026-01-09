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
    email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/),]],
    nombre: [''],
    apellido: [''],
    role: ['VENDEDOR' as UserRole, [Validators.required]],
    password: ['', Validators.minLength(8)], // requerido solo al crear
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

    const pwd = this.form.get('password');
    pwd?.setValidators([Validators.required, Validators.minLength(8)]);
    pwd?.updateValueAndValidity();

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
    const pwd = this.form.get('password');
    pwd?.setValidators([Validators.minLength(8)]);
    pwd?.updateValueAndValidity();
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.errorMsg = '';
    const pwd = this.form.get('password');
    pwd?.setValidators([Validators.minLength(8)]);
    pwd?.updateValueAndValidity();
  }

  save() {
    
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    const v = this.form.value;
    const email = (v.email ?? '').trim().toLowerCase();
    const payload: any = {
      email,
      nombre: v.nombre || undefined,
      apellido: v.apellido || undefined,
      role: v.role!,
    };

    if (!this.editing) {
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

  remove(u: UserDto) {
    const ok = confirm(`¿Eliminar al usuario ${u.email}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    this.usersApi.delete(u.id).subscribe({
      next: () => this.refresh(),
      error: (e) => alert(e?.error?.message || 'No se pudo eliminar el usuario'),
    });
  }
}
