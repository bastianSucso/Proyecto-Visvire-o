# Regla de costos y movimientos en inventario

Esta regla define como se calcula `precioCosto` y como operan ingreso, conversion, traspaso, ledger y documentos en inventario.

## Alcance
- Modulo de inventario.
- Productos tipo `INSUMO` y `REVENTA` para calculos de costo promedio.
- Producto tipo `COMIDA` queda fuera del costo promedio de ingreso/traspaso y se calcula por receta.

## Definiciones
- `precioCosto`: costo unitario vigente del producto.
- `stockActual`: suma de stock del producto antes de una operacion.
- `ledger`: historial de movimientos en tabla `altera`.
- `documentoRef`: UUID comun para agrupar movimientos de un mismo documento.
- `documento`: vista de movimientos agrupados por `documentoRef` para `INGRESO` y `TRASPASO`.

## Tipos de movimiento (ledger)
- `INGRESO`: aumenta stock por compra/ingreso.
- `AJUSTE`: corrige stock manualmente con motivo.
- `SALIDA`: descuenta stock por venta o consumo de receta.
- `TRASPASO`: mueve stock entre ubicaciones.
- `CONVERSION_PRODUCTO`: transforma stock entre producto origen y destino.

## Regla de costo promedio en ingreso
- Aplica a `INSUMO` y `REVENTA`.
- Requiere `cantidad > 0` y `costoIngreso > 0`.
- Si falla validacion, se rechaza toda la operacion.

Formula:

```text
nuevoCostoProm =
  (stockActual * costoActual + ingresoCantidad * costoIngreso)
  / (stockActual + ingresoCantidad)
```

- El nuevo costo se guarda con 2 decimales.
- El ajuste de stock y el nuevo costo se guardan en la misma transaccion.

## Regla de costo promedio en conversion
- La conversion mueve stock desde producto origen a producto destino en una ubicacion.
- Validaciones minimas:
  - `productoOrigenId != productoDestinoId`
  - `factor > 0`
  - stock origen suficiente
  - costo origen y costo destino numericos

Formulas:

```text
cantidadDestino = cantidadOrigen * factor

costoTotalTransferido = cantidadOrigen * precioCostoOrigen

nuevoCostoPromDestino =
  (stockActualDestino * costoActualDestino + costoTotalTransferido)
  / (stockActualDestino + cantidadDestino)
```

- El costo destino se guarda con 2 decimales.
- Stock y costo destino se actualizan en la misma transaccion.
- Si el destino es `INSUMO` y cambia costo, se recalculan recetas impactadas.

## Regla de traspaso
- El traspaso solo mueve cantidades entre origen y destino.
- Reglas:
  - origen y destino no pueden ser iguales
  - cantidad debe ser mayor a 0
  - debe existir stock suficiente en origen
  - no se permite traspasar `COMIDA`
- El traspaso no recalcula `precioCosto`.

## Regla de documentos
- Documento de ingreso: agrupa items de `INGRESO` bajo un `documentoRef`.
- Documento de traspaso: agrupa items de `TRASPASO` bajo un `documentoRef`.
- Cada documento conserva trazabilidad de usuario, fecha, origen/destino e items.

## Regla de trazabilidad
- Todo movimiento queda en ledger (`altera`) con tipo, cantidad, producto, ubicacion/origen/destino, usuario, fecha y referencias (`ventaId` o `documentoRef`).
- `CONVERSION_PRODUCTO` genera dos movimientos con el mismo `documentoRef`.

## Ejemplos

### Ingreso inicial (stock 0)
- `stockActual = 0`, `costoActual = 0`
- `ingresoCantidad = 10`, `costoIngreso = 5.00`
- `nuevoCostoProm = 5.00`

### Ingreso adicional
- `stockActual = 10`, `costoActual = 5.00`
- `ingresoCantidad = 5`, `costoIngreso = 8.00`
- `nuevoCostoProm = 6.00`

### Conversion sin stock destino
- `precioCostoOrigen = 12.00`, `factor = 2`, `cantidadOrigen = 2`
- `cantidadDestino = 4`, `costoTotalTransferido = 24.00`
- destino en `stock=0`, `costo=0` -> nuevo costo destino `6.00`

### Conversion con stock destino
- destino previo: `stockActualDestino = 6`, `costoActualDestino = 5.00`
- `cantidadOrigen = 2`, `factor = 2`, `costoTotalTransferido = 24.00`
- `nuevoCostoPromDestino = (6*5 + 24)/(6+4) = 5.40`

## Objetivo de negocio
- Mantener valorizacion consistente del inventario.
- Evitar diferencias entre stock fisico y stock valorizado.
- Garantizar trazabilidad completa para auditoria operativa.

## Brechas conocidas
- La regla "conversion no aplica a `COMIDA`" esta reforzada en frontend y debe quedar blindada tambien en backend para evitar bypass por API.
- El listado de documentos considera `INGRESO` y `TRASPASO`; conversion se consulta por movimientos/detalle, no como documento listado.
