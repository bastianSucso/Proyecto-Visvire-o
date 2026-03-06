# Criterio de estimacion de Story Points

Este documento define como estimar historias de usuario con Story Points en el proyecto.

## Objetivo
- Clasificar el esfuerzo relativo de implementacion.
- Mantener consistencia entre planificacion de sprint y ejecucion.
- Considerar complejidad funcional y tecnica, no horas exactas.

## Escala usada
- Escala Fibonacci: `1, 2, 3, 5, 8`.

## Factores de evaluacion
- Logica de negocio involucrada.
- Numero de componentes o capas afectadas (frontend, backend, base de datos, integraciones).
- Dependencias con otros modulos.
- Nivel de incertidumbre tecnica y riesgo.

## Niveles de complejidad

### 1 Story Point
- Cambio pequeno o ajuste menor.
- Poca logica de negocio.
- Afecta una parte acotada del sistema.
- Sin integraciones complejas.
- Incertidumbre baja.

### 2 Story Points
- Funcionalidad simple con algo mas de logica que un ajuste minimo.
- Puede involucrar validaciones basicas.
- Puede tocar una o dos capas del sistema.
- Sin integraciones complejas entre modulos.
- Incertidumbre baja.

### 3 Story Points
- Complejidad moderada.
- Frecuente en historias tipo CRUD/formulario completo.
- Suele requerir cambios en varias capas:
  - estructura o campos en base de datos,
  - logica en backend,
  - interfaz o formulario en frontend.
- Puede incluir validaciones adicionales o manejo de estados.
- Implementacion predecible para el equipo.

### 5 Story Points
- Complejidad media-alta.
- Integra distintos componentes o modulos.
- Incluye reglas de negocio mas elaboradas.
- Requiere mayor coordinacion de datos y pruebas de integracion.
- Necesita mas analisis previo que una historia de 3 puntos.

### 8 Story Points
- Alta complejidad.
- Involucra multiples componentes y modulos.
- Logica de negocio significativa o cambios estructurales relevantes.
- Mayor incertidumbre tecnica y riesgo.
- Requiere mas analisis, diseno, implementacion y validacion.

## Regla de corte
- Si una historia supera claramente la complejidad de `8`, debe dividirse en historias mas pequenas.

## Guía de uso en refinamiento
- Estimar por comparacion relativa con historias ya implementadas.
- Priorizar complejidad y riesgo por sobre esfuerzo percibido en horas.
- Ajustar puntos cuando cambie alcance o aparezcan nuevas dependencias.
