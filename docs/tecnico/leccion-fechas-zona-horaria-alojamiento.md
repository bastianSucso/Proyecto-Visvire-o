# Leccion tecnica: fechas y zona horaria en alojamiento

## Contexto
Durante pruebas de `pos/alojamiento` y `pos/alojamiento/seguimiento` se detecto desfase de hora (ejemplo: sistema mostraba 23:28 cuando en Chile eran 20:28) y diferencias por AM/PM.

## Causa raiz
- En backend, varias columnas de Alojamiento estaban definidas como `timestamp` (sin zona horaria).
- En frontend, habia formateo mixto (`toLocaleString` y utilidades manuales) en lugar de una sola regla.
- Algunos valores `datetime-local` se interpretaban de forma ambigua cuando no venian con offset.

## Decision tecnica adoptada
- Backend:
  - Estandarizar persistencia de fechas en `timestamptz` (instante absoluto, UTC).
  - Tratar `datetime-local` como hora de negocio (`America/Santiago`) antes de persistir.
- Frontend:
  - Estandarizar render de fecha/hora con `date` pipe de Angular.
  - Forzar zona horaria `America/Santiago`.
  - Usar formato 24 horas (`dd/MM/yyyy HH:mm`).

## Regla operativa del proyecto
1. Guardar en BD como instante absoluto (`timestamptz`).
2. Convertir al mostrar, no al guardar visualmente.
3. Mostrar siempre en zona del negocio (`America/Santiago`).
4. Evitar `toLocaleString` directo en vistas criticas; preferir `date` pipe.

## Concurrencia y estado de habitaciones
Tambien se corrigio un caso de duplicado de cambios de estado por concurrencia en auto checkout:
- Se mantuvo transaccion.
- Se aplico lock pesimista sobre filas de asignacion sin joins invalidos.
- Se evito el error de Postgres: `FOR UPDATE cannot be applied to the nullable side of an outer join`.

## Que revisar antes de cerrar una HU con fechas
- [ ] Columnas de fecha en entidad: `timestamptz`.
- [ ] Formato UI unificado con `date` pipe.
- [ ] Zona horaria explicita en templates: `America/Santiago`.
- [ ] Formato 24 horas (`HH:mm`) sin AM/PM.
- [ ] Casos borde verificados (madrugada, cambio de dia, filtros por rango).

## Dev vs ambientes con datos
- En desarrollo, si no importa perder datos, se puede resetear BD para aplicar cambio de tipo.
- En ambientes con datos relevantes, usar migracion explicita para convertir `timestamp` -> `timestamptz` sin perdida.

## Referencias
- Regla funcional de noches: `docs/alojamiento-regla-noches.md`
- Criterio de estimacion: `docs/estimacion-story-points.md`
