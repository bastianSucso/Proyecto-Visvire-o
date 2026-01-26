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
