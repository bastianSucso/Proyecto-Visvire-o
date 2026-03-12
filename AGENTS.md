# AGENTS.md
# Repo guide for coding agents

## Repo overview
- Monorepo with two apps:
  - Backend: NestJS + TypeORM in `apps/backend`
  - Frontend: Angular (standalone components) in `apps/frontend`
- Default language: TypeScript
- API base paths are under `/api` (see backend controllers and frontend services)

## Source of truth for rules
- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No Copilot rules found in `.github/copilot-instructions.md`.
- Follow the repo configs listed below.

## Workspaces and entry points
- Backend entry: `apps/backend/src/main.ts`
- Backend module root: `apps/backend/src/app.module.ts`
- Frontend entry: `apps/frontend/src/main.ts`
- Frontend routes: `apps/frontend/src/app/app.routes.ts`

## Install dependencies
- Backend: `cd apps/backend` then `npm install`
- Frontend: `cd apps/frontend` then `npm install`

## Build commands
### Backend (NestJS)
- Build: `npm run build`
- Start (dev): `npm run start:dev`
- Start (prod): `npm run start:prod`

### Frontend (Angular)
- Build: `npm run build`
- Start (dev): `npm run start`
- Watch build: `npm run watch`

## Lint and format
### Backend
- Lint: `npm run lint`
- Format: `npm run format`
- ESLint config: `apps/backend/eslint.config.mjs`
- Prettier config: `apps/backend/.prettierrc`

### Frontend
- Prettier settings live in `apps/frontend/package.json`.
- EditorConfig applies: `apps/frontend/.editorconfig`.
- No ESLint config found for the frontend.

## Test commands
### Backend (Jest)
- All tests: `npm run test`
- Watch: `npm run test:watch`
- Coverage: `npm run test:cov`
- E2E: `npm run test:e2e`

### Backend: run a single test
- By name: `npm run test -- -t "test name"`
- By file: `npm run test -- --runTestsByPath src/modules/users/users.service.spec.ts`
- E2E single file: `npm run test:e2e -- --runTestsByPath test/app.e2e-spec.ts`

### Frontend (Angular/Karma)
- All tests: `npm run test`

### Frontend: run a single test
- By file (Angular CLI include flag):
  `npm run test -- --include=src/app/features/admin/pages/users/users.page.spec.ts`
- By name (Jasmine grep):
  `npm run test -- --grep="test name"`
  Note: `--grep` works only if your test runner supports it; otherwise use `--include`.

## Database and migrations (backend)
- Seed admin: `npm run seed:admin`
- Run migrations: `npm run migration:run`
- Revert migrations: `npm run migration:revert`
- Generate migration: `npm run migration:generate`

## TypeScript configuration
### Backend
- `apps/backend/tsconfig.json`:
  - `module`: nodenext
  - `target`: ES2023
  - `strictNullChecks`: true
  - `noImplicitAny`: false (so any is permitted but discouraged)

### Frontend
- `apps/frontend/tsconfig.json`:
  - `strict`: true
  - `noImplicitOverride`, `noImplicitReturns` enabled
  - Angular strict templates enabled

## Code style and formatting
### Common
- Indentation: 2 spaces
- Final newline required
- Trim trailing whitespace
- Prefer single quotes in TS

### Backend (NestJS)
- Prettier: single quotes, trailing commas
- ESLint: TypeScript recommended, with warnings for:
  - `@typescript-eslint/no-floating-promises`
  - `@typescript-eslint/no-unsafe-argument`
- `@typescript-eslint/no-explicit-any` is off; use `any` only when necessary.

### Frontend (Angular)
- Prettier settings from `package.json`:
  - `printWidth`: 100
  - `singleQuote`: true
  - HTML uses the Angular parser
- EditorConfig enforces single quotes for TS.
- Strict rule: inline templates are forbidden in frontend code.
- Always use `templateUrl` with a separate `*.html` file for pages/components.

## Imports and module structure
### Backend
- Use NestJS module pattern: `*.module.ts`, `*.controller.ts`, `*.service.ts`.
- DTOs in `dto/`, entities in `entities/`.
- Import order pattern observed:
  1) Framework imports (`@nestjs/*`, `typeorm`, etc.)
  2) External libs (`bcrypt`, etc.)
  3) Local modules (`./` and `../`)

### Frontend
- Standalone components with `@Component({ standalone: true, ... })`.
- Use feature/layout/core folder conventions.
- Services in `core/services`, guards in `core/guards`, interceptors in `core/interceptors`.
- Keep domain services (feature-oriented services) and avoid generic `ApiService` abstractions.

## Frontend UI direction
- Visual style: Minimal Corporate UI.
- Use white backgrounds as base.
- Use institutional blue for primary actions and key CTAs.
- Use soft grays for text, dividers, and neutral surfaces.
- Prefer clean, centered forms with low visual noise.
- Build interfaces for professional administrative workflows.

## Frontend UI baseline (obligatorio) - referencia alojamiento/caja
- Referencias visuales base para nuevas interfaces:
  - `apps/frontend/src/app/features/vendedor/pages/alojamiento-home/alojamiento-home.page.html`
  - `apps/frontend/src/app/features/vendedor/pages/caja/caja.page.html`
- Objetivo: mantener consistencia en tipografia, jerarquia, espaciados, bordes, colores y patrones de accion.

### Layout y contenedores
- Base de pagina: `min-h-[calc(100vh-64px)] bg-white`.
- Contenedor principal por tipo de flujo:
  - Administrativo/listados: `mx-auto w-full max-w-6xl px-4 py-6`.
  - Operativo enfocado (tipo caja): `mx-auto w-full max-w-3xl px-4 py-6`.
  - Mapa/canvas/plano: `mx-auto w-full px-4 py-6` (sin max-width fijo).
- Ritmo vertical entre bloques: `space-y-4` o `space-y-6`.

### Tipografia y jerarquia
- Titulo de pagina: `text-xl font-semibold text-slate-900`.
- Subtitulo descriptivo: `text-sm text-slate-500`.
- Titulos de card/seccion: `text-sm font-semibold text-slate-900`.
- Texto operativo general: `text-sm`.
- Labels, metadata y texto de apoyo: `text-xs`.
- Regla: priorizar `text-sm`; usar `text-xs` para informacion secundaria, estados compactos y captions.

### Cards, superficies y bordes
- Card principal: `rounded-2xl border border-slate-200 bg-white shadow-sm`.
- Card secundaria/bloque interno: `rounded-xl border border-slate-200 bg-white`.
- Superficie neutra: `bg-slate-50`.
- Radios:
  - `rounded-2xl` para contenedores grandes.
  - `rounded-xl` para componentes principales.
  - `rounded-lg` para controles compactos.

### Botones
- Primario institucional:
  - `rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800`
- Secundario neutral:
  - `rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50`
- Estados de accion (cuando aplique):
  - Confirmacion/cierre: gama `emerald`.
  - Advertencia: gama `amber`.
  - Riesgo/eliminacion: borde/texto rojo suave.

#### Preferencia explicita del usuario (obligatoria) - botones admin
- En cabeceras/listados administrativos, usar botones con alineacion consistente y misma presencia visual.
- Clase base requerida para botones secundarios de header:
  - `inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100`
- Clase base requerida para botones primarios de header:
  - `inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 active:bg-blue-900`
- Evitar estilos secundarios antiguos en headers (`rounded-lg` sin `inline-flex`, sin `font-medium`, o sin estado `active`).
- Mantener esta preferencia en vistas tipo CRUD administrativo (referencia: `inconsistencias-categorias`).

### Inputs, selects y formularios
- Control estandar:
  - `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm`
- Label estandar:
  - `mb-1 block text-xs font-medium text-slate-600`
- Evitar variantes innecesarias de padding/radio/borde dentro de una misma vista.

### Tablas, badges y estados
- Tabla:
  - Wrapper `overflow-x-auto rounded-xl border border-slate-200`
  - Tabla `w-full text-left text-sm`
  - Header `bg-slate-50 text-slate-600`
- Badges/pills:
  - `rounded-full px-2.5 py-0.5 text-xs` (o `py-1` si se requiere mayor presencia)
- Mantener mapeo de color por estado consistente entre modulos.

### Alertas y feedback
- Error: `rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700`
- Exito: `rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700`
- Advertencia: `rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800`

### Modales
- Overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4`.
- Panel: `w-full rounded-2xl border border-slate-200 bg-white shadow-xl` + `max-w-*` segun contenido.
- Acciones explicitas en formularios: `Cancelar` y `Guardar/Registrar/Confirmar`.

### Regla de adopcion para nuevas vistas
- No crear una nueva linea grafica salvo requerimiento funcional explicito.
- Si la vista pertenece a admin u operacion, heredar este baseline como default.
- Antes de cerrar una UI nueva, contrastar con `alojamiento-home` y `caja` para validar coherencia visual.

### Anti-patrones (evitar)
- Mezclar escalas tipograficas sin criterio (`text-xs`/`text-sm`/`text-base`) en una misma seccion.
- Cambiar color primario principal fuera del azul institucional sin justificacion de negocio.
- Mezclar estilos de inputs o botones equivalentes en la misma pantalla.
- Usar una jerarquia visual distinta a `text-xl` (titulo), `text-sm` (contenido), `text-xs` (soporte).

## Frontend UX conventions (obligatorio)
- Crear/editar registros desde modal (no formularios planos persistentes en la pagina), salvo que la pagina existente ya use otro patron.
- Filtros de listas deben aplicar inmediatamente al cambiar valor (`ngModelChange`/eventos reactivos); evitar boton "Aplicar filtros".
- Mantener consistencia con patrones ya implementados en el repo: cards, modales con overlay, acciones primarias en azul, acciones secundarias bordeadas.
- Para formularios en modal, incluir acciones explicitas `Cancelar` y `Guardar/Registrar`.

### Buscadores de productos (obligatorio)
- Para seleccionar productos en formularios/modales, no usar dropdown masivo; usar buscador con input + sugerencias.
- Referencia visual/UX: buscador del modulo conversion (`Nombre / código / barcode` + dropdown con estados activos en azul).
- Estructura minima por sugerencia:
  - Nombre (`text-sm font-semibold`).
  - Metadata (`text-xs`): `internalCode`, `barcode` (si existe), `unidadBase` (pill), `tipo` (badge).
- Clases recomendadas del item activo:
  - `bg-blue-50 border-l-4 border-blue-600 ring-2 ring-blue-200`.
  - Inactivo: `bg-white hover:bg-slate-50 border-l-4 border-transparent`.
- Interaccion obligatoria:
  - Navegacion por teclado (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
  - Maximo sugerencias visibles: 8.
  - Cierre de sugerencias con `Escape` y al seleccionar.
- Regla de negocio para inconsistencias:
  - Mostrar siempre `tipo` y `unidadBase`.
  - No permitir seleccionar productos `COMIDA`; solo `INSUMO` y `REVENTA`.

## Naming conventions
### Backend
- Classes: `PascalCase` (e.g., `UsersService`, `AuthController`).
- Files: `kebab-case` with suffixes (`users.service.ts`, `create-user.dto.ts`).
- Entities: `SomethingEntity` in `entities/`.
- DTOs: `CreateXDto`, `UpdateXDto`.

### Frontend
- Classes: `PascalCase` (e.g., `LoginPage`, `AdminLayoutComponent`).
- Files: `kebab-case` with suffixes (`login.page.ts`, `users.service.ts`).
- Routes are lazy-loaded with `loadComponent`.

## Error handling patterns
### Backend
- Use NestJS exceptions (`BadRequestException`, `NotFoundException`, etc.).
- Validate input via DTOs and global `ValidationPipe`.
- Return safe objects and avoid leaking sensitive fields (e.g., remove password hash).
- Prefer early returns for invalid states.

### Frontend
- Use RxJS `subscribe` with `next/error/complete` as shown in login page.
- Store tokens in `localStorage` via `AuthService`.
- Interceptors add auth headers when a token exists.

## API and auth conventions
- Backend auth endpoints live under `/api/auth`.
- Frontend uses `AuthService` and `authInterceptor` for JWT.
- Roles observed: `ADMIN`, `VENDEDOR`.
- Guard usage:
  - Backend: `JwtAuthGuard` + `RolesGuard` + `@Roles()`.
  - Frontend: `authGuard` + `roleGuard` with `data.roles`.

## Fechas y zona horaria (obligatorio)
- Persistir fechas en BD como instante absoluto UTC (`timestamptz`).
- En frontend, renderizar fechas con Angular `date` pipe; evitar `toLocaleString` en vistas criticas.
- Mostrar fechas del negocio en zona horaria `America/Santiago`.
- Formato de fecha/hora para flujos operativos: `dd/MM/yyyy HH:mm` (24 horas, sin AM/PM).
- Para inputs `datetime-local`, interpretar el valor como hora local de negocio (`America/Santiago`) antes de convertir y persistir en UTC.
- Regla operativa: entrada local negocio -> persistencia UTC -> visualizacion local negocio.
- Revisar referencia tecnica: `docs/tecnico/leccion-fechas-zona-horaria-alojamiento.md`.

## Files to check when adding features
### Backend
- Controllers: `apps/backend/src/modules/**/**.controller.ts`
- Services: `apps/backend/src/modules/**/**.service.ts`
- Entities: `apps/backend/src/modules/**/entities/*.entity.ts`
- Database config: `apps/backend/src/database/typeorm.config.ts`

### Frontend
- Routes: `apps/frontend/src/app/app.routes.ts`
- Layouts: `apps/frontend/src/app/layouts/**`
- Features: `apps/frontend/src/app/features/**`
- Core services: `apps/frontend/src/app/core/services/**`

## Agent workflow tips
- Keep changes scoped to the app you are working on.
- Prefer TypeScript types over `any`, especially in frontend.
- Run the closest test scope possible before large changes.
- Avoid changing formatting rules; rely on Prettier/EditorConfig.

## Known gaps
- No repo-wide lint for the frontend; keep formatting consistent with Prettier/EditorConfig.
- NestJS template README exists; do not treat it as authoritative project guidance.

## Quick command cheatsheet
- Backend dev server: `npm run start:dev`
- Backend lint: `npm run lint`
- Backend single test: `npm run test -- --runTestsByPath <file>`
- Frontend dev server: `npm run start`
- Frontend single test: `npm run test -- --include=<spec>`
