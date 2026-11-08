# ITSDM Roadmap

## Phase 0 — Architecture
Solution foundation, modular structure, service abstraction.

## Phase 1 — Core MVP
Dashboard, Ideas, Initiatives, Projects, Actions, deterministic rule engine.

## Phase 2 — Finance + Vendors
Finance controls, CAPEX/OPEX, vendor and contract modules.

## Phase 3 — Projects + KPIs
Advanced project controls, KPI expansion.

## Phase 4 — People + Knowledge
Skills, training, knowledge and learning modules.

## Phase 5 — Genius Help Desk
Help Desk and service interaction capabilities.

## Phase 6 — Operations
Operational governance, incidents and control workflows.

## Phase 7 — Enterprise integrations
ServiceNow and broader enterprise integrations.

## Ronda 2 (en curso, 2026-11-08)
Diseño en `docs/superpowers/specs/2026-11-08-ronda-2-diseno.md`: vínculos con selector, borrar/archivar, filtros, CSV, notas y reuniones, importación del resultado de una IA sobre transcripciones, ancho completo, español/inglés, gráficos y calidad.

## Hecho tras la ronda 2
- **Aprobaciones** con reglas como datos, solicitud por email o Teams, decisión registrada y lista en el Panel (`docs/APROBACIONES.md`, diseño en `docs/superpowers/specs/2026-11-08-aprobaciones-diseno.md`).

- **Listas restantes, fase 1 (gobierno):** riesgos, decisiones, lecciones aprendidas y revisiones, con su importación desde reuniones (diseño en `docs/superpowers/specs/2026-11-08-listas-fase1-diseno.md`). Campos y reglas elegidos por defecto, a ajustar.

- **Listas restantes, fase 2 (dinero y proveedores):** presupuestos, CAPEX, OPEX, proveedores y contratos, con cifras calculadas, alertas de renovación y aprobaciones de gasto (diseño en `docs/superpowers/specs/2026-11-08-listas-fase2-diseno.md`). Campos y reglas elegidos por defecto, a ajustar.

- **Listas restantes, fase 3 (servicio y operación):** KPIs, incidentes, interacciones y cambios, con plazos por gravedad, salud y tendencia de KPIs y aprobación de cambios de riesgo (diseño en `docs/superpowers/specs/2026-11-08-listas-fase3-diseno.md`). Campos y reglas elegidos por defecto, a ajustar.

- **Listas restantes, fase 4 (personas y conocimiento):** habilidades (nivel actual y objetivo, brecha, caducidad de certificaciones), planes de formación y base de conocimiento (fecha de revisión y aprobación para publicar políticas). Con esto las 22 listas ya tienen pantalla (diseño en `docs/superpowers/specs/2026-11-08-listas-fase4-diseno.md`). Campos y reglas elegidos por defecto, a ajustar.

- **Power Automate (avisos automáticos):** recetas paso a paso para seis flujos (acciones vencidas por responsable, proyectos en riesgo, incidentes fuera de plazo, aprobaciones sin decidir, contratos por renovar y resumen semanal), con los filtros y expresiones exactos (`docs/POWER_AUTOMATE.md`). Los flujos se crean en el tenant: no van en el paquete y no se han podido probar allí.

## Aplazado tras la ronda 2 (pendiente de retomar)
Quedó fuera a propósito. Para retomarlo, pedir "retoma el roadmap".
- **Integraciones:** Planner (crear plan/tarea al activar iniciativas y proyectos), Power Automate (ya documentado como recetas; falta, si se quiere, un botón en la app que dispare un flujo) y Microsoft Graph (perfil, foto, calendario). Necesitan permisos y flujos del tenant.
- **Roles propios dentro de la aplicación.** Hoy mandan los permisos de SharePoint. (Las **aprobaciones** ya están hechas: ver `docs/APROBACIONES.md`. Quedan fuera los flujos de varios aprobadores y el envío automático de avisos, que dependen de Power Automate.)
- **Migración de esquemas:** cambiar columnas de listas ya creadas sin borrarlas.
- **Responsable como columna de persona** de SharePoint (hoy es el email en texto) y **columnas de búsqueda** reales entre listas.
- **Datos de ejemplo opcionales** al instalar y paquetes separados para sandbox y producción.
- **Llamada a una IA desde la propia app** (hoy solo se importa el resultado), si en el futuro hay un servicio aprobado.

## Propuestas de mejora (sin priorizar, pendientes de decidir)

Lista de lo que falta y de ideas para mejorar la aplicación en todos los aspectos. Nada de esto está hecho. Cada punto indica, entre corchetes, el esfuerzo aproximado (**S** pequeño, **M** medio, **L** grande) y si depende del tenant (**T**). Los marcados con "(comprobado)" son carencias que se han verificado en el código; el resto son ideas.

### Comprobar lo ya hecho (antes de añadir más)
- **Probar el paquete en el tenant real** [S, T]: instalar el `.sppkg` 1.7.0.0, quitarlo y volver a añadirlo sobre listas ya existentes, y comprobar personas, enlaces de email y de Teams, y las 22 listas. Todo se ha probado solo con jsdom y simulaciones.
- **Prueba de principio a fin con un navegador** [M]: un guion que abra el elemento web en un sitio de pruebas y recorra crear, editar, aprobar e importar. Hoy ninguna prueba toca SharePoint de verdad.
- **Probar los flujos de Power Automate** [S, T]: las expresiones de `docs/POWER_AUTOMATE.md` están escritas a mano y no se han ejecutado.

### Datos y estructura
- **Migración de esquemas** [L]: cambiar columnas de listas ya creadas sin borrarlas; hoy, si una versión nueva añade una columna, las listas existentes no la reciben.
- **Columnas de persona y de búsqueda reales** [L]: hoy el responsable es un email en texto y los vínculos entre listas son identificadores de texto. Con columnas reales se podrían usar vistas y filtros nativos de SharePoint, pero obliga a migrar datos.
- **Archivos adjuntos y enlaces a documentos** [M]: guardar el contrato, el acta o el presupuesto junto al elemento (comprobado: no hay adjuntos ni enlaces a documentos en ninguna pantalla).
- **Historial de cambios visible** [M]: mostrar quién cambió qué y cuándo (hoy solo se ve la última modificación; el historial de versiones de SharePoint se activa con un botón de la Ayuda, pero no se consulta desde la app).
- **Papelera y deshacer** [M]: recuperar un elemento borrado o deshacer el último cambio dentro de la app.
- **Detección de duplicados** [S]: avisar al crear una idea, un proveedor o un artículo con un título casi igual a otro.
- **Más de una moneda y tipo de cambio** [M]: hoy los importes no tienen divisa.
- **Presupuesto por mes** [M]: repartir el plan y lo comprometido por mes, para ver el ritmo de gasto y no solo el total.

### Panel, informes y búsqueda
- **Búsqueda global** [M]: un cuadro que busque en todas las listas a la vez (hoy cada pantalla busca solo en la suya).
- **Vistas guardadas y filtros por columna** [M]: guardar combinaciones de filtro y orden, y filtrar por responsable, fecha o prioridad (hoy solo hay búsqueda, estado y "mostrar cerrados").
- **Edición en bloque** [M]: cambiar estado o responsable de varios elementos seleccionados.
- **Panel configurable** [M]: elegir qué contadores y gráficos se ven y su orden; versiones por rol (dirección, responsable de proyecto, servicio).
- **Informes imprimibles y exportación a Excel o PDF** [M]: informe de estado de un proyecto, resumen para el comité y cuadro de mando mensual (comprobado: solo hay exportación CSV, sin impresión).
- **Línea de tiempo (Gantt) de proyectos e hitos** [L]: las fechas de inicio y fin ya existen; falta la vista.
- **Calendario** [M]: vencimientos de acciones, renovaciones de contratos, revisiones y caducidades de certificaciones en un solo calendario.
- **Mapa de riesgos (probabilidad x impacto)** [S]: la puntuación ya se calcula; falta la cuadrícula visual.
- **Histórico de KPIs** [M]: guardar cada medición para dibujar la evolución (hoy solo se guarda el valor actual y el anterior).
- **Cuadro de capacidad del equipo** [M]: cruzar habilidades, formación y carga de acciones por persona.

### Flujo de trabajo y colaboración
- **Aprobaciones con varios aprobadores o en cadena** [L]: hoy hay un aprobador por elemento. Y delegar cuando alguien está de baja.
- **Aprobar desde el email o desde Teams** [L, T]: con una tarjeta adaptable o un flujo de aprobación, en lugar de volver a la aplicación.
- **Comentarios y menciones en cada elemento** [M]: conversación dentro del elemento en lugar de por email.
- **Avisos dentro de la aplicación** [M]: una campana con lo que te han pedido o asignado, sin depender del email.
- **Plantillas de proyecto** [M]: crear un proyecto con sus acciones, riesgos y revisiones típicas ya preparados.
- **Elementos recurrentes** [M]: acciones o revisiones que se repiten cada semana o mes.
- **Dependencias entre acciones y proyectos** [L]: "no puede empezar hasta que termine X" y aviso si se retrasa.
- **Historial de aprobaciones** [S]: hoy cada elemento guarda una sola aprobación (la última); guardar todas permitiría ver qué regla bloqueó qué cambio y cuándo.

### Integraciones
- **Planner** [M, T]: crear plan y tareas al activar iniciativas o proyectos (hay un diseño en `docs/PLANNER_INTEGRATION.md`; necesita permiso de Graph).
- **Microsoft Graph** [M, T]: foto y perfil de las personas, y disponibilidad de calendario al asignar.
- **Botón "enviar aviso ahora"** [M, T]: la aplicación dispara un flujo de Power Automate con disparador HTTP.
- **Teams como pestaña o aplicación** [M, T]: abrir el elemento web dentro de Teams.
- **Importar desde Excel** [M]: cargar una hoja de cálculo con validación previa (hoy solo CSV en cada pantalla y el resultado de una IA para reuniones).
- **ServiceNow o Jira, solo lectura** [L, T]: traer incidentes o tareas externas como referencia.
- **Llamada a una IA desde la propia app** [L, T]: hoy solo se importa el resultado; haría falta un servicio aprobado por la organización.
- **Importación de reuniones más rica** [M]: reconocer también KPIs, incidentes, contratos y formaciones, y detectar duplicados de lo ya existente.

### Seguridad y gobierno
- **Roles propios dentro de la aplicación** [L]: solo lectura, responsable de proyecto, aprobador, administrador; hoy mandan los permisos de SharePoint.
- **Ocultar datos sensibles** [M]: importes y contratos solo para quien deba verlos.
- **Registro de auditoría** [M]: quién aprobó, borró o exportó qué.
- **Umbrales y reglas editables desde la aplicación** [M]: hoy los plazos, los umbrales de aprobación y los días de aviso están en `AppConfig.ts` y requieren recompilar (comprobado: el panel de propiedades solo tiene descripción e idioma).
- **Retención y borrado de datos** [S]: política de cuánto tiempo se guardan elementos cerrados y reuniones con transcripción (la transcripción puede contener datos personales).

### Calidad, rendimiento y mantenimiento
- **Aviso de error global** [S]: si un componente falla, no hay red de seguridad en pantalla (comprobado: no hay límite de errores de React).
- **Carga bajo demanda** [M]: ahora el elemento web carga las 22 listas al abrirse (todos los elementos de cada una); con muchas filas conviene cargar por pestaña y paginar en el servidor.
- **Caché y actualización en segundo plano** [M]: abrir rápido con lo último que se vio y refrescar después.
- **Auditoría de accesibilidad con herramienta** [S]: pasar una revisión automática y una prueba con lector de pantalla (hay etiquetas y uso con teclado, pero no se ha medido).
- **Uso en móvil** [M]: revisar tablas y paneles en pantallas pequeñas.
- **Tema de colores y modo oscuro** [S]: heredar el tema del sitio.
- **Más idiomas** [S]: francés u otros; el sistema de textos ya permite añadirlos.
- **Telemetría de uso, sin datos personales** [M, T]: saber qué pestañas se usan para decidir qué mejorar.
- **Pruebas de carga con miles de filas** [S]: comprobar tiempos de tablas, búsquedas y panel.
- **Notas de cada versión** [S]: un archivo con lo que cambia en cada `.sppkg` y cómo actualizar.
- **Paquetes separados para pruebas y producción, y datos de ejemplo opcionales** [M]: hoy las 22 listas se crean siempre con datos de ejemplo.
- **Despliegue automático** [M, T]: el flujo de CI (`.github/workflows/ci.yml`) ya prueba y empaqueta; falta subir el paquete al catálogo, que hoy se hace a mano.

## Alcance de la primera versión (histórico)
La primera versión dejó fuera finanzas, proveedores, personas, operaciones, Genius Help Desk, ServiceNow y la IA. Todo menos Genius Help Desk, ServiceNow y la IA ya está hecho (ver "Hecho tras la ronda 2"); lo que sigue pendiente está en las secciones de arriba.
