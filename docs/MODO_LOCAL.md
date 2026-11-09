# Modo local (versión independiente)

Una versión de la aplicación que **no necesita SharePoint**: es una página web que abres en Edge o Chrome y que guarda los datos en un **archivo JSON** que eliges, por ejemplo en tu carpeta de OneDrive. Tiene las mismas pestañas, reglas, aprobaciones, textos en inglés y español y datos de ejemplo que la versión de SharePoint, porque es el mismo código con otro almacenamiento.

Estado: **prototipo**. Funciona y está probado con jsdom y en un navegador, pero no se ha probado con tu OneDrive real ni con la política de tu empresa (ver "Lo que hay que comprobar").

## Cuándo usarlo

- Lo gestionas tú sola o solo tú.
- No quieres depender del catálogo de aplicaciones de SharePoint ni del empaquetado de SPFx.
- Otras personas, como mucho, **ven** informes (ver "Que otras personas lo vean").

Si varias personas van a **editar a la vez**, usa la versión de SharePoint: un archivo en OneDrive no está pensado para eso.

## Cómo se prepara y se abre

Desde la carpeta `spfx` (con Node 22):

```bash
npm run standalone
```

Genera la carpeta `dist-standalone` con **dos archivos**: `index.html` y `app.js`. Para abrirla:

- **Doble clic en `index.html`.** Es lo más simple y no instala nada. Si el navegador no te deja leer y escribir el archivo de datos desde una página abierta así, usa la opción siguiente.
- **`npm run standalone:serve`** y abre `http://localhost:4173`. Sirve la carpeta solo en tu equipo.

La carpeta `dist-standalone` se puede copiar a cualquier sitio (por ejemplo, OneDrive) y abrir desde allí. Para programar con recarga automática: `npm run standalone:watch`.

## Cómo se usa

1. En la pantalla de inicio escribe **tu correo** (y, si quieres, tu nombre) y elige el idioma. Se recuerdan solo en este navegador.
2. Elige cómo empezar:
   - **Crear un archivo de datos nuevo.** Te deja elegir dónde guardarlo (por ejemplo, en OneDrive). Puede empezar con los datos de ejemplo.
   - **Abrir un archivo de datos.** Para uno que ya creaste.
   - **Continuar con...** Reabre el último archivo; el navegador pide permiso con un clic.
   - **Abrir una copia de seguridad (.json).** Para navegadores que no pueden abrir archivos directamente (Firefox, Safari). Los cambios quedan en la página hasta que descargues una copia.
   - **Probar con datos de ejemplo.** No guarda nada.
3. Todo cambio se escribe en el archivo al guardar. La cabecera muestra el archivo abierto y tiene **Recargar** (para ver cambios hechos desde otro sitio), **Descargar una copia** (copia de seguridad) y **Cerrar**.

**Un equipo cada vez.** Si abres el mismo archivo desde dos ordenadores a la vez, OneDrive puede crear copias en conflicto. La aplicación detecta que el archivo cambió antes de guardar, vuelve a leerlo y repite el cambio sin pisar lo ajeno, y si no lo consigue lo dice sin guardar. Pero no puede evitar el conflicto de sincronización de OneDrive.

## Qué se guarda y dónde

| Qué | Dónde |
| --- | --- |
| Los datos de la aplicación | El archivo JSON que eliges |
| Tu nombre, correo e idioma | `localStorage` del navegador, solo en este equipo |
| Una referencia al último archivo (para "Continuar con...") | `IndexedDB` del navegador, solo en este equipo |
| Nada más | No hay envío de datos a ningún servidor |

El archivo es JSON legible (`format`, `lists`, y dentro cada lista con sus elementos). Se puede copiar, versionar y restaurar como cualquier archivo. Se escribe de forma segura: el navegador escribe una copia temporal y la sustituye al cerrar, así que un fallo no deja el archivo a medias.

## Lo que cumple de cara a la empresa (y lo que hay que comprobar)

Lo que está hecho en el código:
- **Sin servicios de internet.** La página no usa CDN, ni fuentes remotas, ni análisis, ni conexiones salientes. `index.html` lleva una política de seguridad (CSP) que solo permite lo que está en la propia carpeta y bloquea las conexiones. Las fuentes de Fluent UI que se cargaban de una CDN de Microsoft se han desactivado, y los iconos van dentro del paquete como SVG.
- **Sin instalar nada.** Basta un navegador.
- **Los datos no salen del equipo** salvo lo que tú haces con el archivo (OneDrive lo sincroniza como cualquier otro archivo).

Lo que hay que comprobar con tu empresa antes de usarlo con datos reales:
1. Que se permite **abrir una página web local con JavaScript** (algunos equipos bloquean scripts en archivos locales o piden revisarlos).
2. Que **OneDrive es un sitio aprobado** para estos datos (costes, contratos y proveedores suelen estar clasificados como confidenciales).
3. Que la política de Edge o Chrome permite el **acceso a archivos desde una página** (la API de acceso a archivos). Si no, se usa la copia de seguridad.
4. Que el archivo en OneDrive tiene la **etiqueta de confidencialidad** que corresponda.

## Diferencias con la versión de SharePoint

| | SharePoint (SPFx) | Modo local |
| --- | --- | --- |
| Datos | Listas `IT_*` del sitio | Un archivo JSON |
| Varias personas editando | Sí | No (un equipo cada vez) |
| Búsqueda de personas | El directorio de la empresa | Correos que ya aparecen en los datos, más el que escribas |
| Historial de versiones y papelera | De SharePoint | No (usa copias del archivo) |
| Flujos de Power Automate (`POWER_AUTOMATE.md`) | Sí | No sirven (leen listas de SharePoint) |
| Enlaces de aprobación a la aplicación | Sí | No: el mensaje de email o Teams se redacta igual, pero el enlace no lleva a la página |
| Instalación | Catálogo de aplicaciones | Abrir un HTML |

## Cómo está hecho

```
Pantallas, reglas, textos (iguales)
        │   leen y escriben a través de
        ▼
   IDataStore  ── (contrato de 6 operaciones: leer, crear, actualizar, borrar, buscar personas, historial)
   ├── SharePointService      → listas de SharePoint        (versión SPFx)
   └── DocumentStore          → un documento JSON
            │   guarda con
            ▼
       IDocumentPersistence   → stat / load / save con comprobación de versión
       ├── FileHandlePersistence  → archivo del usuario (API de acceso a archivos)
       ├── MemoryPersistence      → demo y tests
       └── (futuro) BlobPersistence, biblioteca de SharePoint...
```

Archivos principales: `src/data/IDataStore.ts`, `src/data/DocumentStore.ts`, `src/data/persistence.ts`, `src/data/seed.ts`, `src/standalone/*` y `scripts/build-standalone.js`. Los datos de ejemplo salen de la misma fuente que los de SharePoint (`scripts/generate-assets.js` escribe `src/standalone/seed.json`), con las fechas como desplazamientos desde hoy para que no envejezcan.

La aplicación del modo local y la de SharePoint comparten los componentes (`src/components/App/HubTabs.tsx` y todo lo que cuelga de él). Cambiar una pantalla las cambia a las dos.

## Cómo evolucionar el almacenamiento

El contrato `IDataStore` está pensado para que cambiar dónde viven los datos no toque las pantallas. Lo que sigue **no está construido**: son los caminos previstos.

### Azure Blob Storage
Un `BlobPersistence implements IDocumentPersistence` que guarda el mismo JSON como un blob:
- `stat()` = el ETag del blob (petición `HEAD`).
- `load()` = descargar el blob y su ETag.
- `save()` = subirlo con `If-Match: <ETag>`; si otro lo cambió, el servicio responde 412 y se lanza el error de conflicto que `DocumentStore` ya sabe reintentar.

A diferencia de un archivo en OneDrive, esto da **control de concurrencia real** y permitiría varias personas editando con cuidado. Hace falta decidir la autenticación: Microsoft Entra ID (MSAL en el navegador, con un registro de aplicación del inquilino) o una dirección SAS de corta duración; la CSP de `index.html` tendría que permitir la conexión a esa cuenta. Sigue siendo un único documento: con mucha gente editando conviene una base de datos.

### Base de datos SQL
Un navegador no puede hablar con SQL directamente (credenciales y red). El camino es una **API** propia (Azure Functions o App Service) que expone las seis operaciones del contrato por HTTP, y en la aplicación un `HttpStore implements IDataStore`. Las tablas guardarían las mismas columnas que hoy las listas (`SHAREPOINT_SCHEMA.md`), con lo que los mapeadores no cambian. Es la opción para varias personas editando, con permisos y auditoría reales.

### Biblioteca de documentos de SharePoint
El mismo JSON en una biblioteca, con el ETag de la API REST como versión. Mantiene el almacenamiento dentro de SharePoint pero sin listas ni empaquetado SPFx.

## Que otras personas lo vean

En orden de menos a más trabajo:
1. **Informe estático** (pendiente de construir): un botón que genere una página HTML de solo lectura con el panel y las tablas, para compartir con un enlace de OneDrive. Nadie edita, así que no hay conflictos.
2. **Visor de solo lectura** que abra el mismo archivo con permiso de lectura.
3. **Publicar la aplicación** en un sitio estático (biblioteca de SharePoint, Azure Static Web Apps o un contenedor de Blob con sitio web estático) con datos en Blob o en una API. Para controlar quién entra hace falta autenticación con Entra ID, que necesita un **registro de aplicación** en el inquilino: es una decisión de TI. Ojo: algunos inquilinos de SharePoint fuerzan la descarga de los archivos HTML en lugar de mostrarlos.

## Pendiente y limitaciones conocidas

- No se ha probado con tu OneDrive ni con la política de tu empresa.
- No se ha comprobado que `index.html` abierto con doble clic permita escribir el archivo en todos los navegadores. Si falla, usa `npm run standalone:serve`.
- Los cambios hechos desde otro equipo se ven al pulsar **Recargar**; no hay aviso automático.
- Hay un solo documento: con decenas de miles de elementos habría que pasar a Blob con partición o a SQL.
- Sin filtros ni paginación en el almacén (ninguna pantalla los usa hoy; `filter` falla con un error explícito).
- Los iconos son un conjunto reducido; si Fluent UI usa en algún control un icono que no está, se verá en blanco.
- Sin informes imprimibles ni exportación (ver `ROADMAP.md`).
