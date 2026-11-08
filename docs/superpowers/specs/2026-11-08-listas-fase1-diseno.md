# ITSDM — Listas restantes, fase 1 (gobierno): diseño

Fecha: 2026-11-08. Segundo bloque del roadmap aplazado. El responsable dijo: "lo recomendado hazlo por ahora y cuando me ponga lo voy viendo", así que **todos los campos y reglas de abajo son decisión mía** y están pensados para ajustarse después.

## 1. Alcance de la fase

Cuatro de las 16 listas restantes, las más ligadas a lo que ya existe (reuniones, notas, proyectos): **riesgos** (`IT_11_Risks`), **decisiones** (`IT_12_Decisions`), **lecciones aprendidas** (`IT_20_LessonsLearned`) y **revisiones** (`IT_19_Reviews`). Fases siguientes (no incluidas): dinero y proveedores; servicio y operación; personas y conocimiento.

## 2. Objetivos, no objetivos

**Objetivos**
1. Una pantalla por lista con todo lo de las demás (búsqueda, filtros, orden, detalle, archivar, borrar, CSV, idiomas), reutilizando `EntityScreen`.
2. Los riesgos tienen **puntuación** (probabilidad × impacto) y nivel, visibles en la tabla y en el Panel.
3. Lo dicho en una reunión (riesgos, decisiones, lecciones) se puede **importar** a su lista, como ya se hace con acciones y notas.
4. Cada proyecto e iniciativa muestra en su detalle los riesgos, decisiones, lecciones y revisiones relacionados.

**No objetivos:** aprobaciones sobre estas listas (el motor lo permite añadiendo reglas), matrices de riesgo gráficas, seguimiento automático de revisiones periódicas, enlaces entre riesgos y decisiones.

## 3. Decisiones (mías, ajustables)

### Riesgos (`IT_11_Risks`)
- Campos: título, ID, descripción, estado, **probabilidad** (Baja/Media/Alta), **impacto** (Bajo/Medio/Alto), responsable, mitigación, fecha límite de mitigación, proyecto, iniciativa, reunión.
- Estados: Abierto → En mitigación / Aceptado → Cerrado (se puede reabrir).
- Puntuación = probabilidad (1-3) × impacto (1-3), de 1 a 9. Nivel: **Bajo** hasta 2, **Medio** hasta 4, **Alto** desde 6. La puntuación y el nivel se calculan, no se guardan.
- El Panel cuenta los riesgos **altos sin cerrar** y los incluye en "Requiere atención".

### Decisiones (`IT_12_Decisions`)
- Campos: título, ID, contexto, motivo, estado, decidida por, fecha, proyecto, iniciativa, reunión.
- Estados: Propuesta → Decidida → Sustituida. Al pasar a Decidida se rellenan la fecha (hoy) y quién decidió (el usuario) si estaban vacías.
- Una decisión que sale de una reunión se importa ya como **Decidida**, con la fecha de la reunión (a diferencia del resto, que empieza en su primer estado: en una reunión una decisión es algo ya tomado).

### Lecciones aprendidas (`IT_20_LessonsLearned`)
- Campos: título, ID, qué pasó, recomendación, categoría (Proceso, Tecnología, Personas, Proveedor, Otra), estado, responsable, proyecto, iniciativa, reunión.
- Estados: Nueva → Revisada → Aplicada.

### Revisiones (`IT_19_Reviews`)
- Campos: título, ID, tipo (Estado, Riesgos, Financiera, Cierre), estado, **salud** (Verde/Ámbar/Rojo), fecha, próxima revisión, resumen, siguientes pasos, responsable, proyecto, iniciativa.
- Estados: Programada → Completada / Cancelada (se puede reprogramar).
- No se importan desde reuniones: una revisión es un acto propio, no algo que se mencione.

### Común
- Los vínculos siguen siendo el ID de negocio elegido en un selector. Responsable como email. Estados cerrados (ocultos por defecto): Cerrado, Sustituida, Aplicada, Completada, Cancelada.
- Pestaña nueva **Gobierno** con cuatro vistas, igual que Notas y Reuniones.
- Importación: la IA puede devolver `risks`, `decisions` y `lessons`; aparecen en la vista previa con los mismos avisos que el resto. La instrucción que se copia se amplía.

## 4. Esquema

Cuatro listas nuevas en el paquete, con datos de ejemplo enlazados al proyecto de ejemplo. Versión 1.4.0.0. Se crean al añadir la aplicación al sitio (o con los scripts de `scripts/`).

## 5. A criterio de quien construye

Textos, aspecto de las tarjetas y de la tabla de riesgos.

## 6. Riesgos

Sin probar contra el tenant (listas nuevas). Si algún campo o estado no encaja con vuestra forma de trabajar, es lo primero a cambiar.
