# Asuntos, bandeja de entrada y panel conectado: diseño

Fecha: 2026-11-09. Estado: aprobado por la usuaria ("me gustan todas, implementalas"); implementado y probado con jsdom, sin probar en el tenant. Versión del paquete: 1.8.0.0.

## Por qué

La usuaria gestiona TI sola y recibe información por muchos canales (correo, Teams, avisos de Europa y corporación, peticiones del edificio y de usuarios, logística del servicio de Orange, retail, incidencias de red, renovaciones como la del helpdesk, el budget). No se le pierde nada, pero hay muchos asuntos distintos y quiere **una sola herramienta viva** donde ver todo lo pendiente, consultar el histórico de lo cerrado, guardar enlaces a las páginas que usa (Lenovo, Oracle...), adjuntar ficheros, planificar proyectos nuevos (por ejemplo, un helpdesk al estilo de la Apple Store, o una app de taquillas para otro equipo) y poder compartir algo concreto, como el budget. Debe poder crecer con nuevas funciones y estar lo más conectada posible.

## Lo que ya existía (comprobado en el código)

Contratos con aviso de renovación, presupuestos, CAPEX/OPEX, proveedores, incidencias, interacciones con fecha de seguimiento, acciones con fecha límite, notas, reuniones, ideas, iniciativas y proyectos, riesgos, formación, base de conocimiento, aprobaciones, importación CSV, español e inglés. Faltaba: bandeja de entrada, áreas transversales, adjuntos, directorio de enlaces, una vista única de fechas y plantillas de proyecto.

## Objetivos

- Una **bandeja de entrada** donde caiga lo que llega de correo y Teams (por flujos de Power Automate) y lo que se añade a mano, para clasificarlo después.
- Un registro de **asuntos** con área, origen, fecha límite, notas, adjuntos y enlace opcional a un contrato, proyecto, incidencia o proveedor; con **histórico** de lo cerrado.
- **Áreas** editables (budget, usuarios, edificio, Orange, retail, Europa...) sin tocar código.
- **Directorio de enlaces** por categorías, con fijados en el panel.
- **Garantías y licencias** con fecha de fin y aviso, como los contratos.
- **Agenda** única con todo lo que tiene fecha.
- **Añadir rápido** desde cualquier pestaña.
- **Adjuntos** en cualquier elemento (en SharePoint, adjuntos nativos de la lista).
- **Plantillas de proyecto** que crean el proyecto y sus acciones.
- Recetas de **flujos** para meter correo y Teams en la bandeja, y receta para **compartir** con solo lectura.

## No objetivos

- No leer el correo ni Teams desde la propia aplicación (necesitaría un registro de aplicación en el inquilino; es decisión de TI). La entrada la hacen flujos de Power Automate, que la usuaria puede crear.
- No hay compartir dentro de la aplicación: se hace con los permisos de SharePoint.
- No hay editor de plantillas dentro de la aplicación (las plantillas van en código).
- Los adjuntos no funcionan en el modo local (no hay dónde guardar ficheros dentro del JSON de forma razonable).

## Antiobjetivos

- Que un enlace guardado permita ejecutar código (`javascript:`): solo se aceptan `http` y `https`.
- Que algo clasificado quede sin área, o que un asunto en la bandeja desaparezca de la vista sin estar clasificado.
- Que un mismo correo llegue dos veces a la bandeja (la receta del flujo comprueba asunto, remitente y día antes de crear el asunto).

## Diseño

### Datos: cuatro listas nuevas (de 22 a 26)

| Lista | Contenido |
| --- | --- |
| `IT_23_Matters` | Asuntos. Estado `INBOX` (sin clasificar), `OPEN`, `IN_PROGRESS`, `WAITING`, `DONE`, `DISCARDED`. Prioridad, área (`AreaId`), origen (`MANUAL`, `EMAIL`, `TEAMS`, `OTHER`), referencia de origen (enlace al mensaje), remitente, recibido el, fecha límite, cerrado el, responsable, notas y vínculos opcionales (`ProjectId`, `ContractId`, `IncidentId`, `VendorId`). |
| `IT_24_Areas` | Áreas: `AreaId`, descripción, estado (`ACTIVE`, `ARCHIVED`), orden. |
| `IT_25_Links` | Enlaces: `LinkId`, dirección, categoría (texto libre con sugerencias), descripción, fijado (`YES`/`NO`), estado, proveedor opcional. |
| `IT_26_Entitlements` | Garantías, licencias, soportes y suscripciones: tipo, producto, referencia, cantidad, inicio, fin, días de preaviso, coste anual, proveedor y contrato opcionales, responsable, notas. Estados `ACTIVE`, `EXPIRED`, `RENEWED`, `CANCELLED`. |

### Reglas (puras y con pruebas)

- Un asunto que sale de `INBOX` exige **área**. Al pasar a `DONE` o `DISCARDED` se rellena "cerrado el" con hoy (y se borra si se reabre).
- **Vencido**: abierto (no `INBOX`, no cerrado) con fecha límite anterior a hoy. **Bandeja**: estado `INBOX`.
- Garantías y licencias: mismo criterio que los contratos (aviso `RENEWAL` dentro del preaviso, `LAPSED` si terminó y sigue `ACTIVE`).
- **Agenda**: función pura que reúne las fechas de asuntos, acciones, contratos (decisión de renovar y fin), garantías, seguimientos, revisiones, riesgos, formaciones, certificaciones, proyectos, artículos por revisar, cambios y plazos de incidencias, y las ordena con su urgencia. Un cuadrante de mes calcula la cuadrícula.
- **Plantilla de proyecto**: función pura que, dada una plantilla, un título, un responsable y una fecha de inicio, devuelve el proyecto y sus acciones con fechas desplazadas.

### Pantallas

- Pestaña **Asuntos** con cuatro vistas: **Bandeja** (sin clasificar), **Abiertos**, **Histórico** (cerrados, con búsqueda) y **Áreas**.
- Pestaña **Enlaces** y pestaña **Agenda**.
- **Garantías y licencias** dentro de la pestaña de proveedores.
- **Añadir rápido** en la cabecera: título, área, fecha límite y notas. Sin área va a la bandeja; con área va directo a abiertos.
- **Panel**: casillas de bandeja, asuntos abiertos y vencidos, garantías por vencer; líneas de atención; enlaces fijados.
- **Adjuntos** en el panel de edición de cualquier lista (si el almacén los admite), con subir, abrir y borrar.
- En **Proyectos**, botón "Crear desde plantilla" con tres plantillas: renovar el helpdesk al estilo de un servicio de atención de referencia, app para otro equipo (como una gestión de taquillas) y renovación de contrato o licencia.

### Capa de datos

`IDataStore` gana `capabilities.attachments` y tres operaciones opcionales (`listAttachments`, `addAttachment`, `deleteAttachment`) más `enableAttachments`. `SharePointService` las implementa con los adjuntos nativos de PnPjs. `DocumentStore` declara `attachments: false`. Una lista de SharePoint creada desde el esquema tiene los adjuntos activados por defecto; si alguna no los tiene, la sección de adjuntos lo detecta y ofrece activarlos, y la pestaña de Ayuda tiene un botón que los activa en todas.

## Decisiones tomadas por mí (a revisar)

- La bandeja **es** la lista de asuntos con estado `INBOX`, no una lista aparte: un solo sitio y un solo modelo.
- Áreas como lista editable. Se instalan con diez áreas de ejemplo (las que citó la usuaria); se pueden renombrar, archivar o añadir.
- Garantías y licencias es una lista propia y no una ampliación de contratos: tienen otros campos (producto, cantidad, serie) y otro ritmo.
- La agenda no abre el elemento al pulsarlo: muestra tipo, título y fecha (pendiente: navegación entre pestañas).
- Correo: el flujo recoge solo lo que se marque con bandera o se mueva a una carpeta, no todo el correo; Teams, solo el mensaje elegido con "Más acciones".
- No se guardan claves de licencia: el campo es "referencia o serie" y la Ayuda avisa de no pegar claves.
- Las listas nuevas solo se crean al volver a añadir la aplicación al sitio, o con el script de aprovisionamiento (igual que en las fases anteriores).

## Lo que queda para el futuro

Navegar desde la agenda al elemento; editor de plantillas dentro de la aplicación; compartir un informe de solo lectura desde la aplicación; leer correo y Teams con Microsoft Graph si TI concede un registro de aplicación; reglas de clasificación editables en la aplicación (hoy van en el flujo); adjuntos en el modo local.
