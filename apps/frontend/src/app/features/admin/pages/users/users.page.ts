import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { UsersService, UserDto } from '../../../../core/services/users.service';
import { UserRole } from '../../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: 'users.page.html',
})
export class UsersPage {
  private usersApi = inject(UsersService);
  private fb = inject(FormBuilder);

  users: UserDto[] = [];
  loading = false;
  errorMsg = '';

  // UX tabla (igual que Productos / POS)
  q = '';
  pageSize = 20;
  page = 1;
  readonly pageSizes = [10, 20, 50, 100];

  // modal state
  modalOpen = false;
  editing: UserDto | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)]],
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
      next: (u) => {
        this.users = u ?? [];
        this.page = 1;
      },
      error: (e) => (this.errorMsg = e?.error?.message || 'Error al cargar usuarios'),
      complete: () => (this.loading = false),
    });
  }

  // ------- tabla helpers -------
  onSearchChange() {
    this.page = 1;
  }

  onPageSizeChange() {
    this.page = 1;
  }

  private normalize(s: any) {
    return String(s ?? '').toLowerCase().trim();
  }

  get filtered(): UserDto[] {
    const term = this.normalize(this.q);
    if (!term) return this.users;

    return this.users.filter((u) => {
      const fullName = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim();
      const hay = [
        u.email,
        fullName,
        u.role,
        u.isActive ? 'activo' : 'bloqueado',
      ]
        .map((x) => this.normalize(x))
        .join(' | ');

      return hay.includes(term);
    });
  }

  get totalItems() {
    return this.filtered.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageItems(): UserDto[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get fromItem() {
    if (this.totalItems === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toItem() {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  first() { this.page = 1; }
  prev() { this.page = Math.max(1, this.page - 1); }
  next() { this.page = Math.min(this.totalPages, this.page + 1); }
  last() { this.page = this.totalPages; }

  // ------- modal -------
  openCreate() {
    this.editing = null;
    this.errorMsg = '';
    this.form.reset({ role: 'VENDEDOR' as UserRole });

    const pwd = this.form.get('password');
    pwd?.setValidators([Validators.required, Validators.minLength(8)]);
    pwd?.updateValueAndValidity();

    this.modalOpen = true;
  }

  openEdit(u: UserDto) {
    this.editing = u;
    this.errorMsg = '';
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
      error: (e) => (this.errorMsg = e?.error?.message || 'No se pudo actualizar estado'),
    });
  }

  remove(u: UserDto) {
    const ok = confirm(`¿Eliminar al usuario ${u.email}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    this.usersApi.delete(u.id).subscribe({
      next: () => this.refresh(),
      error: (e) => (this.errorMsg = e?.error?.message || 'No se pudo eliminar el usuario'),
    });
  }

  // util
  fullName(u: UserDto) {
    return `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || '-';
  }
}
