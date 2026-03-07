# Modulo Finanzas: consolidacion, IVA y resumen

## Contexto
Se implemento el modulo de Finanzas con enfoque de consolidacion persistida (sin migraciones, usando `synchronize` en desarrollo), para cubrir:
- HU-FIN-05 (ingresos externos manuales),
- HU-FIN-02A (egresos manuales),
- HU-FIN-06 (ingresos internos automaticos desde ventas POS y alojamiento),
- HU-FIN-02B (egresos automaticos desde ingresos de inventario),
- HU-FIN-03 (IVA por periodo),
- HU-FIN-07 (resumen financiero consolidado).

## Objetivo tecnico
Centralizar en una sola tabla financiera los movimientos de ingreso/egreso, con:
- trazabilidad,
- anti-duplicidad por origen,
- consolidacion idempotente,
- consultas por periodo para IVA y resumen.

## Modelo de datos
Entidad principal: `movimiento_financiero`.

Campos relevantes:
- `id` (uuid)
- `tipo`: `INGRESO | EGRESO`
- `origenTipo`: `EXTERNO_MANUAL | VENTA_POS | VENTA_ALOJAMIENTO | EGRESO_MANUAL | INVENTARIO_INGRESO | RRHH_PAGO`
- `origenId` (nullable, string)
- `monto` (`numeric(12,2)`)
- `moneda` (`CLP`)
- `categoria`
- `descripcion`
- `metodoPago`
- `referencia`
- `fechaMovimiento` (`timestamptz`)
- `aplicaCreditoFiscal` (campo tecnico reutilizado segun contexto, ver seccion de semantica)
- `ivaTasa` (default `0.1900`)
- `metadata` (jsonb)
- `estado`: `ACTIVO | ANULADO`
- auditoria: `createdBy`, `createdAt`, `updatedAt`, `anuladoBy`, `anuladoAt`, `anuladoMotivo`

Indices:
- `ux_movimiento_financiero_origen_unico` en (`origenTipo`, `origenId`) cuando `origenId IS NOT NULL` (anti-duplicidad)
- indices por fecha, tipo, categoria, estado.

## Regla de idempotencia
La consolidacion automatica no duplica registros:
- se intenta insertar por `origenTipo + origenId`,
- si ya existe, se ignora (`orIgnore`).

Esto permite reintentos y recalculos sin doble contabilizacion.

## Fuentes de movimientos

### Manuales
1. Ingreso externo manual:
   - `tipo = INGRESO`
   - `origenTipo = EXTERNO_MANUAL`
2. Egreso manual:
   - `tipo = EGRESO`
   - `origenTipo = EGRESO_MANUAL`

### Automaticos
1. Venta POS confirmada:
   - `tipo = INGRESO`
   - `origenTipo = VENTA_POS`
2. Venta alojamiento confirmada:
   - `tipo = INGRESO`
   - `origenTipo = VENTA_ALOJAMIENTO`
3. Ingreso de inventario:
   - `tipo = EGRESO`
   - `origenTipo = INVENTARIO_INGRESO`
   - `monto = cantidad * costoIngresoUnitarioTotal`

## API backend (admin)
Base: `/api/finanzas`

- `POST /ingresos-externos`
- `GET /ingresos-externos`
- `POST /egresos-manuales`
- `GET /egresos-manuales`
- `GET /movimientos`
- `PATCH /movimientos/:id` (solo manuales)
- `DELETE /movimientos/:id` (anulacion logica, solo manuales)
- `GET /iva`
- `GET /resumen`

Todos protegidos con `JwtAuthGuard + RolesGuard` y rol `ADMIN`.

## Semantica tributaria (importante)
El campo tecnico `aplica_credito_fiscal` se usa hoy con semantica dual por compatibilidad de esquema:
- En egresos: representa credito fiscal (correcto tributariamente).
- En ingresos externos: se usa como marca de "afecto a IVA debito" a nivel funcional/UI.

Nota: en UI de ingresos se renombro el texto para evitar confusion:
- antes: "Credito fiscal"
- ahora: "Afecto a IVA debito"

## Regla vigente de IVA

### IVA debito
Se calcula al 19% sobre:
- ingresos de `VENTA_POS`,
- ingresos de `VENTA_ALOJAMIENTO`,
- ingresos `EXTERNO_MANUAL` marcados como afectos a debito (usando el campo tecnico actual).

### IVA credito
Se calcula al 19% sobre:
- egresos (`tipo = EGRESO`) con `aplicaCreditoFiscal = true`.

### IVA neto
`IVA neto = IVA debito - IVA credito`

Estado:
- `IVA_A_PAGAR` si neto > 0
- `REMANENTE_A_FAVOR` si neto < 0
- `SIN_DIFERENCIA` si neto = 0

## Resumen financiero
`GET /api/finanzas/resumen` consolida por periodo:
- ingresos totales y por origen,
- egresos totales y por origen,
- resultado del periodo (`ingresos - egresos`),
- bloque de IVA (debito, credito, neto, estado).

## Frontend admin
Rutas:
- `/admin/finanzas/resumen`
- `/admin/finanzas/ingresos`
- `/admin/finanzas/egresos`

Paginas:
- resumen consolidado (solo lectura),
- registro/listado de ingresos externos,
- registro/listado de egresos manuales.

Servicio frontend:
- `apps/frontend/src/app/core/services/finanzas.service.ts`

## Integraciones en backend
Consolidacion automatica conectada en:
- `apps/backend/src/modules/ventas/ventas.service.ts` (confirmacion POS),
- `apps/backend/src/modules/alojamiento/alojamiento.service.ts` (venta alojamiento),
- `apps/backend/src/modules/inventario/inventario.service.ts` (ingresos inventario).

## Reglas operativas y limites actuales
- Moneda base: `CLP`.
- Monto valido: `> 0`.
- Trazabilidad con usuario/fecha.
- No eliminacion fisica: se usa anulacion logica.
- Zona de negocio para cortes de periodo: `America/Santiago`.
- Sin migraciones en esta etapa (desarrollo).

## Verificacion minima recomendada (QA)
1. Registrar ingreso externo valido y monto invalido (`<= 0`).
2. Registrar egreso manual con y sin credito fiscal.
3. Confirmar venta POS y validar movimiento financiero automatico.
4. Confirmar venta alojamiento y validar movimiento financiero automatico.
5. Registrar ingreso inventario y validar egreso automatico.
6. Reintentar procesos y verificar no duplicidad.
7. Validar IVA por rango y resumen consolidado.
8. Validar anulacion logica de manuales.
9. Validar que no se altera logica operativa de ventas/caja/inventario.

## Deuda tecnica conocida
- El nombre de columna `aplica_credito_fiscal` no expresa bien el caso de ingresos afectos a debito.
  - Pendiente recomendado (futuro): separar semanticamente en campos distintos o normalizar naming con migracion en etapa pre-produccion.
- En produccion se recomienda reemplazar `synchronize` por migraciones versionadas.
