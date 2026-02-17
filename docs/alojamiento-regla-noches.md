# Regla de noches en alojamiento

Esta regla define como se calcula `cantidadNoches` para estadias del modulo de alojamiento.

## Zona horaria oficial
- Zona horaria de negocio: `America/Santiago`
- Todo calculo de noche y checkout se hace con esa zona, independiente de la zona horaria del servidor o del navegador.

## Definiciones
- Ventana nocturna: `[20:00, 05:00)`
  - Incluye desde `20:00:00` hasta `04:59:59`.
  - Excluye exactamente `05:00:00`.
- Hora de checkout: `12:00`.

## Algoritmo
1. Tomar `fechaIngreso` en zona `America/Santiago`.
2. Definir `fechaBaseNoche`:
   - Si la hora local de ingreso esta entre `00:00` y antes de `05:00`, usar el dia anterior.
   - En cualquier otro caso, usar el mismo dia del ingreso.
3. Calcular fecha de salida estimada como:
   - `fechaSalidaEstimada = fechaBaseNoche + cantidadNoches`, con hora `12:00`.

## Ejemplos (1 noche)
- Ingreso `13-02-2026 00:23` -> salida `13-02-2026 12:00`.
- Ingreso `13-02-2026 04:59` -> salida `13-02-2026 12:00`.
- Ingreso `13-02-2026 05:00` -> salida `14-02-2026 12:00`.
- Ingreso `13-02-2026 12:00` -> salida `14-02-2026 12:00`.
- Ingreso `13-02-2026 16:00` -> salida `14-02-2026 12:00`.
- Ingreso `13-02-2026 20:00` -> salida `14-02-2026 12:00`.

## Objetivo de negocio
Si un huesped ya paso por la ventana nocturna, se considera que ya consumio una noche.
