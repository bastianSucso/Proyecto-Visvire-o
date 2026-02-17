# Regla de ingredientes, grupos y recetas

Esta regla define como se modelan ingredientes y grupos de ingredientes, y como impactan en el costo de productos tipo `COMIDA`.

## Alcance
- Modulo de productos y recetas.
- Productos `INSUMO` como ingredientes.
- Productos `COMIDA` cuyo costo se calcula por receta.

## Definiciones
- `ingrediente`: producto de tipo `INSUMO`.
- `grupo ingrediente` (`insumo_grupo`): conjunto de insumos alternativos para una misma necesidad de receta.
- `item de grupo`: relacion grupo-insumo con `priority` opcional y estado `isActive`.
- `receta`: linea que relaciona una `COMIDA` con un grupo ingrediente y su `cantidadBase`.
- `rendimiento`: cantidad de porciones o unidades resultantes de la comida.

## Reglas de grupo ingrediente
- Solo se aceptan productos tipo `INSUMO` dentro del grupo.
- No se permite repetir el mismo producto en un mismo grupo.
- Todos los items activos de un grupo deben compartir `unidadBase`.
- Un grupo sin items activos no puede sostener una receta valida.

## Estrategias de seleccion de ingrediente

### PRIORITY
- Se elige el item activo con menor `priority`.
- Si un item no tiene `priority`, queda al final del orden.
- No se permite prioridad duplicada entre items activos.

### LOWEST_COST
- Se elige el item activo con menor `precioCosto`.

## Regla de calculo de costo de comida
- Para cada linea de receta:
  - se resuelve 1 ingrediente segun estrategia del grupo;
  - se calcula subtotal por linea.

Formula por linea:

```text
subtotalLinea = cantidadBase * precioCostoIngredienteSeleccionado
```

Costo total receta:

```text
totalCostoReceta = SUM(subtotalLinea)
```

Costo final de la comida:

```text
si rendimiento > 0:
  precioCostoComida = totalCostoReceta / rendimiento
si rendimiento <= 0 o nulo:
  precioCostoComida = totalCostoReceta
```

- `precioCosto` de comida se guarda con 2 decimales.

## Recalculo automatico de costos
Se recalcula costo de comidas impactadas cuando ocurre alguno de estos eventos:
- cambia `precioCosto` de un `INSUMO`;
- cambia estrategia o estado de un grupo ingrediente;
- se agrega/edita/elimina un item de grupo;
- se agrega/edita/elimina una linea de receta;
- cambia `rendimiento` de una comida;
- ingreso o conversion actualiza costo de un insumo usado por recetas.

## Regla operativa en ventas
- Al confirmar venta de una `COMIDA`, el sistema resuelve el ingrediente real por grupo con la estrategia vigente.
- El consumo de inventario se descuenta como movimientos `SALIDA` de los insumos seleccionados.

## Objetivo de negocio
- Mantener costo de `COMIDA` alineado al costo real de insumos.
- Permitir reemplazos operativos de insumo sin romper receta.
- Reducir quiebres operativos mediante estrategias de seleccion controladas.

## Brechas conocidas
- Si un grupo queda sin items activos, la comida relacionada queda sin base valida para costo y consumo.
- Cambios manuales de costo en insumos impactan inmediatamente costos de comidas relacionadas; se recomienda control de cambios para auditoria.
