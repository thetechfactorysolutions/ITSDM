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

- **Modo local (prototipo):** versión independiente de la aplicación, una página web que guarda los datos en un archivo JSON de OneDrive, con almacenamiento intercambiable (`IDataStore`, `DocumentStore`) pensado para añadir después Azure Blob, una API con SQL o publicarla (`docs/MODO_LOCAL.md`, diseño en `docs/superpowers/specs/2026-11-09-modo-local-diseno.md`). Probado con jsdom y en un navegador; falta probarlo con el OneDrive y la política de la empresa.

- **Asuntos, bandeja y panel conectado:** bandeja de entrada con áreas editables, asuntos con histórico, directorio de enlaces, garantías y licencias, agenda única con calendario, añadir rápido, adjuntos en cualquier lista, plantillas de proyecto (helpdesk al estilo de un servicio de referencia, app para otro equipo, renovación) y recetas de flujos para meter correo y Teams en la bandeja (`docs/ASUNTOS.md`, diseño en `docs/superpowers/specs/2026-11-09-asuntos-bandeja-diseno.md`). Paquete 1.8.0.0, 26 listas. Probado con jsdom; falta probarlo en el tenant y crear los flujos.

## Aplazado tras la ronda 2 (pendiente de retomar)
Quedó fuera a propósito. Para retomarlo, pedir "retoma el roadmap".
- **Integraciones:** Planner (crear plan/tarea al activar iniciativas y proyectos), Power Automate (ya documentado como recetas; falta, si se quiere, un botón en la app que dispare un flujo) y Microsoft Graph (perfil, foto, calendario). Necesitan permisos y flujos del tenant.
- **Roles propios dentro de la aplicación.** Hoy mandan los permisos de SharePoint. (Las **aprobaciones** ya están hechas: ver `docs/APROBACIONES.md`. Quedan fuera los flujos de varios aprobadores y el envío automático de avisos, que dependen de Power Automate.)
- **Migración de esquemas:** cambiar columnas de listas ya creadas sin borrarlas.
- **Responsable como columna de persona** de SharePoint (hoy es el email en texto) y **columnas de búsqueda** reales entre listas.
- **Datos de ejemplo opcionales** al instalar y paquetes separados para sandbox y producción.
- **Llamada a una IA desde la propia app** (hoy solo se importa el resultado), si en el futuro hay un servicio aprobado.

## Propuestas de mejora, ordenadas en fases (pendientes de decidir)

Nada de esto está hecho. Cada punto indica, entre corchetes, el esfuerzo aproximado (**S** pequeño, **M** medio, **L** grande) y si depende del tenant (**T**). Los marcados con "(comprobado)" son carencias verificadas en el código; el resto son ideas.

**Criterio del orden:** primero lo que reduce el riesgo de lo ya hecho, después lo que más se nota en el uso diario, después los informes, después lo que prepara la aplicación para crecer, y al final lo que necesita decisiones de organización o permisos del tenant. Dentro de una fase el orden es orientativo. Una fase puede empezar sin haber terminado la anterior, salvo donde se indica una dependencia.

### Fase A: validar y proteger lo hecho
Todo es pequeño y reduce el riesgo antes de añadir más funciones.
1. **Probar el paquete en el tenant real** [S, T] y **probar el modo local con tu OneDrive y la política de la empresa** [S, T]: instalar el `.sppkg` 1.7.0.0, quitarlo y volver a añadirlo sobre listas ya existentes, y comprobar personas, enlaces de email y de Teams y las 22 listas. Todo se ha probado solo con jsdom y simulaciones.
2. **Probar los flujos de Power Automate** [S, T]: las expresiones de `docs/POWER_AUTOMATE.md` están escritas a mano y no se han ejecutado.
3. **Aviso de error global** [S]: si un componente falla, no hay red de seguridad en pantalla (comprobado: no hay límite de errores de React).
4. **Pruebas de carga con miles de filas** [S]: medir tiempos de tablas, búsquedas y panel; da la línea base para decidir la fase D.
5. **Auditoría de accesibilidad con herramienta** [S]: pasar una revisión automática y una prueba con lector de pantalla (hay etiquetas y uso con teclado, pero no se ha medido).
6. **Notas de cada versión** [S]: un archivo con lo que cambia en cada `.sppkg` y cómo actualizar.
7. **Prueba de principio a fin con un navegador** [M]: un guion que abra el elemento web en un sitio de pruebas y recorra crear, editar, aprobar e importar. Hoy ninguna prueba toca SharePoint de verdad.

### Fase B: uso diario (lo que más se nota)
Mejoras de las pantallas actuales, casi todas sin cambiar la estructura de datos.
1. **Mapa de riesgos (probabilidad x impacto)** [S]: la puntuación ya se calcula; falta la cuadrícula visual.
2. **Detección de duplicados** [S]: avisar al crear una idea, un proveedor o un artículo con un título casi igual a otro.
3. **Vistas guardadas y filtros por columna** [M]: guardar combinaciones de filtro y orden, y filtrar por responsable, fecha o prioridad (hoy solo hay búsqueda, estado y "mostrar cerrados").
4. **Búsqueda global** [M]: un cuadro que busque en todas las listas a la vez (hoy cada pantalla busca solo en la suya).
5. **Edición en bloque** [M]: cambiar estado o responsable de varios elementos seleccionados.
6. ~~**Calendario**~~ **Hecho** (pestaña Agenda): falta abrir el elemento al pulsarlo en el calendario.
7. ~~**Archivos adjuntos y enlaces a documentos**~~ **Hecho** (adjuntos de SharePoint en el panel de edición de cada lista). Pendiente: adjuntos en el modo local y vista previa del fichero.
8. **Histórico de KPIs** [M]: guardar cada medición para dibujar la evolución (hoy solo se guarda el valor actual y el anterior).
9. **Historial de aprobaciones** [S]: hoy cada elemento guarda una sola aprobación (la última); guardarlas todas permite ver qué regla bloqueó qué cambio y cuándo.
10. **Umbrales y reglas editables desde la aplicación** [M]: hoy los plazos, los umbrales de aprobación y los días de aviso están en `AppConfig.ts` y requieren recompilar (comprobado: el panel de propiedades solo tiene descripción e idioma).
11. **Uso en móvil** [M]: revisar tablas y paneles en pantallas pequeñas.
12. **Tema de colores y modo oscuro** [S]: heredar el tema del sitio.
13. **Más idiomas** [S]: francés u otros; el sistema de textos ya permite añadirlos.

### Fase C: informes y panel
Lo que pide la dirección y los comités. Se apoya en los datos que ya existen.
1. **Informes imprimibles y exportación a Excel o PDF** [M]: informe de estado de un proyecto, resumen para el comité y cuadro de mando mensual (comprobado: solo hay exportación CSV, sin impresión).
2. **Panel configurable** [M]: elegir qué contadores y gráficos se ven y su orden; versiones por rol (dirección, responsable de proyecto, servicio).
3. **Línea de tiempo (Gantt) de proyectos e hitos** [L]: las fechas de inicio y fin ya existen; falta la vista.
4. **Presupuesto por mes** [M]: repartir el plan y lo comprometido por mes, para ver el ritmo de gasto y no solo el total.
5. **Más de una moneda y tipo de cambio** [M]: hoy los importes no tienen divisa.
6. **Cuadro de capacidad del equipo** [M]: cruzar habilidades, formación y carga de acciones por persona.
7. **Historial de cambios visible** [M]: mostrar quién cambió qué y cuándo (hoy solo se ve la última modificación; el historial de versiones de SharePoint se activa con un botón de la Ayuda, pero no se consulta desde la app).
8. **Papelera y deshacer** [M]: recuperar un elemento borrado o deshacer el último cambio dentro de la app.

### Fase D: cimientos para crecer
Además de lo de abajo, el modo local abre estos pasos (ver `docs/MODO_LOCAL.md`): **informe estático de solo lectura** [M] para que otras personas vean el panel sin editar, **`BlobPersistence`** [M, T] para guardar en Azure Blob con control de versión real, **`HttpStore` y una API delante de SQL** [L, T] si hace falta edición simultánea, y **publicar la versión independiente** [M, T] en un sitio estático aprobado con autenticación de Entra ID.
Rendimiento y mantenimiento. Conviene decidir qué hacer a partir de los resultados de las pruebas de carga de la fase A. La migración de esquemas es requisito de las columnas reales de la fase F.
1. **Carga bajo demanda y paginación en servidor** [M]: ahora el elemento web carga las 22 listas al abrirse (todos los elementos de cada una); con muchas filas conviene cargar por pestaña.
2. **Caché y actualización en segundo plano** [M]: abrir rápido con lo último que se vio y refrescar después.
3. **Migración de esquemas** [L]: cambiar columnas de listas ya creadas sin borrarlas; hoy, si una versión nueva añade una columna, las listas existentes no la reciben.
4. **Paquetes separados para pruebas y producción, y datos de ejemplo opcionales** [M]: hoy las 22 listas se crean siempre con datos de ejemplo.
5. **Despliegue automático** [M, T]: el flujo de CI (`.github/workflows/ci.yml`) ya prueba y empaqueta; falta subir el paquete al catálogo, que hoy se hace a mano.
6. **Retención y borrado de datos** [S]: política de cuánto tiempo se guardan elementos cerrados y reuniones con transcripción (la transcripción puede contener datos personales).

### Fase E: colaboración y gobierno
Cambian cómo trabaja el equipo. Antes de empezar hay que decidir quién puede ver y hacer qué. Los roles propios son requisito de ocultar datos y del registro de auditoría.
1. **Roles propios dentro de la aplicación** [L]: solo lectura, responsable de proyecto, aprobador, administrador; hoy mandan los permisos de SharePoint.
2. **Ocultar datos sensibles** [M]: importes y contratos solo para quien deba verlos.
3. **Registro de auditoría** [M]: quién aprobó, borró o exportó qué.
4. **Aprobaciones con varios aprobadores o en cadena** [L]: hoy hay un aprobador por elemento. Y delegar cuando alguien está de baja.
5. **Comentarios y menciones en cada elemento** [M]: conversación dentro del elemento en lugar de por email.
6. **Avisos dentro de la aplicación** [M]: una campana con lo que te han pedido o asignado, sin depender del email.
7. **Plantillas de proyecto** [M]: **hecho en parte** (tres plantillas con proyecto y acciones, en código). Pendiente: riesgos y revisiones típicos, y editarlas dentro de la aplicación.
8. **Elementos recurrentes** [M]: acciones o revisiones que se repiten cada semana o mes.
9. **Dependencias entre acciones y proyectos** [L]: "no puede empezar hasta que termine X" y aviso si se retrasa.
10. **Importar desde Excel** [M]: cargar una hoja de cálculo con validación previa (hoy solo CSV en cada pantalla y el resultado de una IA para reuniones).
11. **Importación de reuniones más rica** [M]: reconocer también KPIs, incidentes, contratos y formaciones, y detectar duplicados de lo ya existente.

### Fase F: integraciones y decisiones de organización
Dependen de permisos del tenant, de aprobaciones de seguridad o de un servicio externo. Se pueden adelantar si el administrador del tenant concede los permisos antes.
1. **Planner** [M, T]: crear plan y tareas al activar iniciativas o proyectos (hay un diseño en `docs/PLANNER_INTEGRATION.md`; necesita permiso de Graph).
2. **Microsoft Graph** [M, T]: foto y perfil de las personas, y disponibilidad de calendario al asignar.
3. **Botón "enviar aviso ahora"** [M, T]: la aplicación dispara un flujo de Power Automate con disparador HTTP.
4. **Aprobar desde el email o desde Teams** [L, T]: con una tarjeta adaptable o un flujo de aprobación, en lugar de volver a la aplicación.
5. **Teams como pestaña o aplicación** [M, T]: abrir el elemento web dentro de Teams.
6. **Columnas de persona y de búsqueda reales** [L]: hoy el responsable es un email en texto y los vínculos entre listas son identificadores de texto. Con columnas reales se podrían usar vistas y filtros nativos de SharePoint, pero obliga a migrar datos (requiere la migración de esquemas de la fase D).
7. **Telemetría de uso, sin datos personales** [M, T]: saber qué pestañas se usan para decidir qué mejorar.
8. **ServiceNow o Jira, solo lectura** [L, T]: traer incidentes o tareas externas como referencia.
9. **Llamada a una IA desde la propia app** [L, T]: hoy solo se importa el resultado; haría falta un servicio aprobado por la organización.

### Siguientes pasos de la bandeja y la agenda (pendientes de decidir)
- Abrir el elemento desde la agenda y desde las líneas de "Atención" del Panel.
- Reglas de clasificación editables en la aplicación (hoy van dentro del flujo).
- Leer correo y Teams con Microsoft Graph si TI concede un registro de aplicación (hoy: flujos de Power Automate).
- Informe de solo lectura para compartir el budget sin dar acceso a la lista.
- Asuntos recurrentes (el budget de cada mes, revisiones periódicas).

## Alcance de la primera versión (histórico)
La primera versión dejó fuera finanzas, proveedores, personas, operaciones, Genius Help Desk, ServiceNow y la IA. Todo menos Genius Help Desk, ServiceNow y la IA ya está hecho (ver "Hecho tras la ronda 2"); lo que sigue pendiente está en las secciones de arriba.
