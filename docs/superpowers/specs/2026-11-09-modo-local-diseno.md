# Modo local y almacenamiento intercambiable: diseño

Fecha: 2026-11-09. Estado: prototipo construido (ver `docs/MODO_LOCAL.md`). Lo descrito en las secciones 1 a 5 está hecho; la 6 y las persistencias de Azure Blob y SharePoint, y la API para SQL, quedan documentadas y sin construir.

## Por qué

SPFx (Node 22, gulp, empaquetado, catálogo de aplicaciones) hace pesado programar y probar. La usuaria gestiona la aplicación sola, quiere poder dejar que otras personas la **vean** en el futuro, puede ejecutar páginas web locales y usar su OneDrive corporativo, y debe cumplir las medidas de la empresa. Quiere además que el diseño no cierre el paso a **Azure Blob**, a una **base de datos SQL** ni a **publicar** la aplicación en algún sitio.

## Objetivos

- Una versión **independiente** de la aplicación (una página web sin servidor ni instalación) que guarda los datos en un **archivo JSON de OneDrive**.
- El **mismo código** de pantallas, reglas, textos y tests. SPFx sigue funcionando sin cambios de comportamiento.
- Una capa de datos pequeña e intercambiable, para añadir después Azure Blob, SQL o un servicio propio sin tocar las pantallas.

## No objetivos

- No sustituir SharePoint: queda como una opción más.
- No resolver la edición simultánea de varias personas sobre un archivo (eso es SharePoint, Blob con control de versión o una base de datos).
- No reescribir en Python o PowerShell.

## Antiobjetivos (lo que sería un fracaso aunque "funcione")

- Que la página llame a servicios de internet, cargue código o fuentes de una CDN, o envíe datos fuera del navegador sin que la usuaria lo sepa.
- Perder datos por una escritura a medias o por pisar un cambio hecho desde otro equipo.

## Qué hay hoy (comprobado)

Solo 7 archivos importan `SharePointService`. Las pantallas leen estado de `HubData` (hook `useListItems`) y escriben con `create`, `update` y `remove`. La capa de datos usa seis operaciones: `getItems`, `getItem`, `createItem`, `updateItem`, `deleteItem`, `searchUsers` y, solo la Ayuda, `enableVersioning`. Ninguna pantalla usa `filter`, `orderBy`, `top` ni `skip`: siempre se carga la lista entera y se filtra en memoria. Los mapeadores leen registros con forma de SharePoint (`Id`, `Title`, fechas ISO, `Editor: { Title }`).

## Diseño

### 1. Contrato `IDataStore` (`src/data/IDataStore.ts`)

Las seis operaciones anteriores más `capabilities` (qué opcionales soporta: historial de versiones, búsqueda de personas del directorio). `SharePointService` lo implementa sin cambiar su comportamiento. `HubData` y los hooks dependen solo del contrato y reciben `store` y `userEmail`, no un `WebPartContext`.

### 2. Almacén por documento (`DocumentStore`)

Guarda **toda la base de datos como un documento JSON**: `{ version, lists: { [lista]: { nextId, items[] } } }`. Pone `Id`, `Created`, `Modified`, `Editor` y `Author` como lo haría SharePoint, para que los mapeadores no cambien. Cada escritura sigue este ciclo: leer lo último → aplicar la operación → guardar comprobando que nadie cambió el documento entre medias; si cambió, vuelve a leer y reaplica (hasta 3 intentos) y, si no lo consigue, falla con un mensaje claro en lugar de pisar datos.

El almacenamiento concreto se enchufa mediante `IDocumentPersistence { stat(); load(); save(documento, versiónEsperada) }`:

| Persistencia | Estado | Notas |
| --- | --- | --- |
| Memoria | Hecho | Demo y tests |
| Archivo local (API de acceso a archivos del navegador) | Hecho | Archivo JSON de OneDrive; versión = fecha de modificación + tamaño |
| Azure Blob | Documentado | Un blob JSON con `If-Match` (ETag): control de concurrencia real; autenticación con Entra ID (MSAL) o SAS de corta duración |
| SharePoint (biblioteca de documentos) | Documentado | El mismo JSON en una biblioteca; versión = ETag de la API REST |

### 3. Para una base SQL o un servicio propio

Una base SQL no se puede llamar desde el navegador (credenciales y red). Se pone delante una **API** (Azure Functions o App Service) que expone las mismas seis operaciones por HTTP. En la aplicación sería un `HttpStore implements IDataStore`. Las tablas guardarían las mismas columnas que hoy las listas (`docs/SHAREPOINT_SCHEMA.md`), así que los mapeadores no cambian. No se construye ahora: solo se deja el contrato y se documenta.

### 4. Aplicación independiente (`src/standalone`)

- Pantalla de inicio: abrir o crear el archivo de datos, probar con datos de ejemplo en memoria, nombre y correo de la persona usuaria, idioma. Recuerda el último archivo (el permiso se vuelve a pedir con un clic).
- Cabecera con el archivo abierto, "Recargar", "Descargar copia" y "Cerrar".
- Las mismas pestañas que SPFx (`HubTabs`, compartidas).
- Búsqueda de personas: correos que ya aparecen en los datos, más cualquier correo escrito.
- Se empaqueta con esbuild en **un solo archivo JavaScript** (formato clásico, sin módulos) más un `index.html`, así se puede abrir con doble clic (`file://`) o servir desde cualquier sitio estático.
- `index.html` lleva una política de seguridad (CSP) que solo permite lo propio: sin CDN, sin fuentes remotas, sin conexiones salientes.

### 5. Datos de ejemplo

Salen de la **misma fuente** que los de SharePoint (`scripts/generate-assets.js`), con las fechas guardadas como desplazamiento ("hoy -5 días") y resueltas al abrir, para que no envejezcan.

### 6. Publicar la aplicación (más adelante)

Al ser estática, vale cualquier sitio de archivos estáticos aprobado: una biblioteca de SharePoint (se abre como página; ojo, SharePoint puede forzar la descarga de HTML en algunos inquilinos), Azure Static Web Apps o un contenedor de Blob con sitio web estático. Para que otras personas la vean con control de acceso hace falta autenticación (Entra ID con MSAL), que requiere un registro de aplicación en el inquilino: es una decisión de TI, no de código. Para solo lectura sin autenticación propia, el camino más simple es exportar un informe HTML estático y compartirlo con un enlace de OneDrive.

## Riesgos y decisiones abiertas

- La API de acceso a archivos solo existe en Edge y Chrome, y puede estar bloqueada por política. Plan B: "Descargar copia" y abrir una copia con "Abrir desde copia".
- OneDrive puede crear copias en conflicto si el mismo archivo se edita desde dos equipos a la vez. El almacén detecta el cambio al guardar, pero no puede evitar el conflicto de sincronización de OneDrive. Regla de uso: un equipo cada vez.
- Los iconos de Fluent UI se cargan por defecto desde una CDN: en el prototipo **no se cargan** (cumple la CSP); los botones muestran solo texto. Pendiente: incluir los iconos en el paquete.
- Las aprobaciones funcionan como registro; los enlaces de los mensajes no llevan a la aplicación.
- Los flujos de Power Automate (`docs/POWER_AUTOMATE.md`) leen listas de SharePoint y no sirven en este modo.

## Decisiones tomadas por mí (a revisar)

- Un solo documento JSON en lugar de un archivo por lista: simplifica la concurrencia y las copias de seguridad. Si crece mucho, se cambia la persistencia sin tocar el resto.
- esbuild y no webpack/gulp para la versión independiente.
- Sin filtros, ordenación ni paginación en el almacén por documento (nadie los usa hoy); `filter` falla con un error explícito.
