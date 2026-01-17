import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
  },

  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {path: 'dashboard', loadComponent: () =>import('./features/admin/pages/dashboard/dashboard.page').then(m => m.DashboardPage),},
      {path: 'users', loadComponent: () => import('./features/admin/pages/users/users.page').then(m => m.UsersPage),},
      {path: 'productos', loadComponent: () => import('./features/admin/pages/productos/productos.page').then(m => m.ProductosPage),},
    ],
  },

  {
    path: 'pos',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['VENDEDOR', 'ADMIN'] },
    loadComponent: () =>
      import('./layouts/vendedor-layout/vendedor-layout.component').then((m) => m.VendedorLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard-vendedor' },
      { path: 'dashboard-vendedor', loadComponent: () => import('./features/vendedor/pages/dashboard/dashboard-vendedor').then(m => m.DashboarVendedordPage) },
      { path: 'caja', loadComponent: () => import('./features/vendedor/pages/caja/caja.page').then(m => m.CajaPage) },
      {path: 'productos-sala',loadComponent: () =>import('./features/vendedor/pages/productos-sala/productos-sala.page').then(m => m.ProductosSalaPage),},
      { path: 'incidencias', loadComponent: () => import('./features/vendedor/pages/incidencias/incidencias.page').then(m => m.IncidenciasPage) },
    ],
  },

  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: '**', redirectTo: 'auth/login' },
];
