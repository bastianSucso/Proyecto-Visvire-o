# Leccion tecnica: defaults de catalogos y formularios CRUD de unidades

## Contexto
Durante la implementacion del CRUD de unidades de producto se detectaron dos problemas criticos:
- La edicion en fila podia terminar creando un registro nuevo en lugar de actualizar el existente.
- Algunas unidades default (`g`, `kg`, `ml`, `l`, `unidad`, `pack`) parecian reaparecer o tener comportamiento inconsistente tras eliminacion/edicion.

Estos problemas afectaban la confianza del usuario y la consistencia operativa.

## Sintomas observados
- En el modal de unidades, al editar una fila y guardar, se creaba otra unidad en ciertos flujos.
- El input de edicion en tabla quedaba comprimido y no permitia visualizar bien lo escrito.
- Al eliminar defaults de unidades, podian volver a aparecer por logica de auto-siembra.

## Causa raiz
### 1) Auto-seed en runtime de catalogos
- `UnidadesMedidaService` sembraba defaults automaticamente cuando la tabla estaba vacia (`list` / validaciones).
- `InconsistenciasCategoriasService` sembraba defaults en `onModuleInit`.
- Resultado: los reinicios o accesos al modulo podian reintroducir datos eliminados por usuarios.

### 2) Formulario de edicion inline con submit implicito
- En tabla editable, el uso de submit implicito en filas puede disparar handlers no deseados.
- Esto puede mezclar accidentalmente flujos de crear/editar si no se separan eventos de manera explicita.

### 3) Layout de fila editable sin priorizacion de ancho
- El input de edicion no tenia una restriccion de ancho minimo adecuada.
- Los botones podian comprimir el campo, degradando UX.

## Solucion aplicada
### A) Politica de datos base
- Se elimino la siembra automatica en runtime para unidades y categorias.
- Se adopto politica explicita:
  1. Datos base no sensibles por migracion idempotente.
  2. Restauracion manual via script idempotente cuando sea necesario.

### B) Mecanismo explicito de defaults
- Se agrego migracion idempotente para defaults de:
  - `unidad_medida`
  - `inconsistencia_categoria`
- Estrategia SQL: `INSERT ... ON CONFLICT DO NOTHING`.

### C) Soporte operativo
- Se agrego script manual `seed:catalogos` (idempotente) para restaurar catalogos base bajo demanda, sin depender de reinicios.

### D) Estandar de formularios en frontend
- Se migro el modal de unidades a `ReactiveFormsModule`.
- Se removio submit implicito en edicion inline.
- Se dejaron acciones explicitas por boton (`type="button"`) y manejo de `Enter` controlado.
- Se mejoro layout del input editable (`flex-1`, `min-w-*`, botones `shrink-0`).

## Regla operativa resultante
1. No auto-seed en runtime para catalogos administrables.
2. Defaults por migracion idempotente (versionada).
3. Restauracion de defaults solo por accion explicita (script o accion admin).
4. Eliminacion permitida solo si no hay referencias; con referencias, solo desactivar.
5. En CRUD admin/modal, preferir formularios reactivos y evitar mezclar patrones.

## Checklist para futuros catalogos CRUD
- [ ] El modulo no siembra defaults en `list`, `onModuleInit` ni boot implicito.
- [ ] Existe migracion idempotente para defaults de negocio base.
- [ ] Existe opcion manual de restauracion (`seed:catalogos` o accion admin) si aplica.
- [ ] La regla de delete por referencias esta implementada y testeada.
- [ ] Formularios en modal/tabla usan `ReactiveFormsModule`.
- [ ] Edicion inline no depende de submit implicito.
- [ ] Input editable conserva ancho util con `flex-1` + `min-w-*`.

## Comandos utiles
```bash
# aplicar migraciones (incluye defaults de catalogos)
npm run migration:run

# restaurar catalogos base de forma explicita (idempotente)
npm run seed:catalogos
```

## Aprendizaje clave
En catalogos administrables por el usuario, el backend nunca debe "corregir" silenciosamente datos al reiniciar. La consistencia y la confianza se mantienen cuando la restauracion de defaults es una accion explicita, trazable y controlada.
