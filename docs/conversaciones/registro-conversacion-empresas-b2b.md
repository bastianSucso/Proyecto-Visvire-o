# Registro de conversacion - Expansion modulo Empresas (B2B)

Fecha: 2026-03-07

## Contexto del negocio
El sistema gestiona tres servicios principales:
- Alojamiento
- Reventa de productos
- Elaboracion de productos (comidas, sandwich, etc.)

Se requiere expandir el modulo de empresas para registrar servicios corporativos de alto volumen, incluyendo control comercial y operativo.

## Necesidades planteadas
1. Registrar en el modulo de empresas los servicios brindados y su estado:
   - Si tiene orden de compra (OC)
   - Si esta facturada
   - Si esta pagada o no

2. Alojamiento corporativo:
   - Ya existe huesped asociado a empresa.
   - El pago lo realiza la empresa (convenio).
   - Falta reflejar en el modulo de empresas:
     - Huespedes alojados por empresa
     - Fechas de estadia
     - Cantidad de noches
     - Tarifa negociada (por noche, por pieza, o monto especial distinto al normal)

3. Alimentacion para empresas:
   - No debe pasar por POS (gestion directa empresa-negocio).
   - Si debe descontar inventario (insumos).
   - Debe calcular costo de produccion y precio de venta empresa.
   - Debe registrar:
     - Cantidad de platos
     - Tipo de preparacion
     - Fecha
     - Empresa destino
     - Precio costo y precio de venta

## Hallazgos tecnicos actuales (repo)
- Existe CRUD de empresas hostal.
- Existe asignacion de huespedes con tipo de cobro `EMPRESA_CONVENIO`.
- Existe logica de consumo de receta y descuento de inventario en POS (ventas).
- Existe modulo de finanzas con movimientos automaticos por origen (`VENTA_POS`, `VENTA_ALOJAMIENTO`, etc.).

## Propuesta de implementacion (resumen)
1. Crear un libro de servicios empresa (cabecera):
   - Empresa
   - Tipo de servicio (`ALOJAMIENTO`, `ALIMENTACION`, futuro `REVENTA`)
   - Fechas
   - OC
   - Estado facturacion
   - Estado pago
   - Totales

2. Alojamiento empresa (detalle):
   - Vincular asignaciones de habitacion.
   - Guardar snapshot comercial:
     - huesped, habitacion, fechas, noches
     - modalidad tarifa (`POR_NOCHE`, `POR_PIEZA`, `MONTO_FIJO`)
     - precio unitario acordado, cantidad, subtotal

3. Alimentacion empresa (detalle fuera POS):
   - Registrar preparaciones por empresa.
   - Reutilizar logica de recetas para consumo de insumos.
   - Descontar stock y registrar movimientos de inventario.
   - Guardar costo y precio de venta snapshot.

4. Finanzas:
   - Reconocer ingreso al marcar servicio como pagado.
   - Nuevo origen financiero sugerido: `SERVICIO_EMPRESA`.
   - Separar operacion, facturacion y cobranza.

5. Frontend (admin/empresas):
   - Vista por empresa con pestanas:
     - Resumen
     - Alojamiento
     - Alimentacion
   - Filtros por fecha/estado y exportable.

## Decision pendiente
- Definir si el MVP incluye pagos parciales (abonos) o solo pago total (`PENDIENTE`/`PAGADA`).
