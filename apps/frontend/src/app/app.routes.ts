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
      {path: 'preparaciones', loadComponent: () => import('./features/admin/pages/preparaciones/preparaciones.page').then(m => m.PreparacionesPage),},
      {path: 'insumo-grupos', loadComponent: () => import('./features/admin/pages/insumo-grupos/insumo-grupos.page').then(m => m.InsumoGruposPage),},
      {path: 'alojamiento-mapa', loadComponent: () => import('./features/admin/pages/alojamiento-mapa/alojamiento-mapa.page').then(m => m.AlojamientoMapaPage),},
      {path: 'recetas', loadComponent: () => import('./features/admin/pages/recetas/recetas.page').then(m => m.RecetasPage),},
      {path: 'bodegas', loadComponent: () => import('./features/admin/pages/bodegas/bodegas.page').then(m => m.BodegasPage),},
      {path: 'cajas', loadComponent: () => import('./features/admin/pages/cajas/cajas.page').then(m => m.CajasPage),},
      {path: 'inventario', loadComponent: () => import('./features/admin/pages/inventario/inventario.page').then(m => m.InventarioPage),},
      {path: 'inventario/conversion', loadComponent: () => import('./features/admin/pages/inventario/conversion/inventario-conversion.page').then(m => m.InventarioConversionPage),},
      {path: 'inventario/ingresos', loadComponent: () => import('./features/admin/pages/inventario/ingreso/inventario-ingreso.page').then(m => m.InventarioIngresoPage),},
      {path: 'inventario/traspasos', loadComponent: () => import('./features/admin/pages/inventario/traspaso/inventario-traspaso.page').then(m => m.InventarioTraspasoPage),},
      {path: 'inventario/documentos/:documentoRef', loadComponent: () => import('./features/admin/pages/inventario/documento/inventario-documento.page').then(m => m.InventarioDocumentoPage),},
      {path: 'inventario/documentos', loadComponent: () => import('./features/admin/pages/inventario/documentos/inventario-documentos.page').then(m => m.InventarioDocumentosPage),},
      {path: 'inventario/movimientos/detalle/:tipo/:ref', loadComponent: () => import('./features/admin/pages/inventario/movimientos/detalle/inventario-movimiento-detalle.page').then(m => m.InventarioMovimientoDetallePage),},
      {path: 'inventario/movimientos', loadComponent: () => import('./features/admin/pages/inventario/movimientos/inventario-movimientos.page').then(m => m.InventarioMovimientosPage),},
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
      { path: 'historial-caja', loadComponent: () => import('./features/vendedor/pages/historial-caja/historial-caja.page').then(m => m.HistorialCajaPage) },
      { path: 'historial-caja/:id', loadComponent: () => import('./features/vendedor/pages/historial-caja-detalle/historial-caja-detalle.page').then(m => m.HistorialCajaDetallePage) },
      {path: 'productos-sala',loadComponent: () =>import('./features/vendedor/pages/productos-sala/productos-sala.page').then(m => m.ProductosSalaPage),},
      { path: 'incidencias', loadComponent: () => import('./features/vendedor/pages/incidencias/incidencias.page').then(m => m.IncidenciasPage) },
      {path: 'ventas/:id', loadComponent: () =>import('./features/vendedor/pages/venta-edit/venta-edit.page').then(m => m.VentaEditPage),},
    ],
  },

  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: '**', redirectTo: 'auth/login' },
];
