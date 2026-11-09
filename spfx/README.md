# IT Management Hub (`itsdm`)

Web part de SharePoint Framework (SPFx 1.23.2, React 17, Fluent UI 8) para que un responsable de TI gestione su portfolio. Funciona en páginas de SharePoint, en una **sección de ancho completo** y en Teams, en español e inglés.

Flujo de negocio: **Idea → Iniciativa → Proyecto → Acción**, con **Notas** y **Reuniones**, un **Panel** que resume lo vencido y lo que está en riesgo, y la **importación del resultado de una IA** sobre la transcripción de una reunión (ver `../docs/IMPORTAR_REUNIONES.md`).

## Requisitos

- **Node 22** (`>=22.14.0 <23`). SPFx 1.23 no arranca con Node 18 ni con Node 24. La versión fijada está en `.nvmrc`.

```bash
nvm use 22.14.0
npm install
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npx gulp serve` | Servidor local para el workbench de SharePoint |
| `npm run package` | Genera las listas, compila y crea `sharepoint/solution/itsdm.sppkg` |
| `npm run assets` | Solo regenera los XML de las listas (`sharepoint/assets`) |
| `npm test` | Lint + compilación + 18 grupos de tests (reglas, validación, ids, importación, idiomas, hook y pantallas) |

Despliegue: `npm run package` → subir `sharepoint/solution/itsdm.sppkg` al catálogo de aplicaciones → **añadir la app al sitio** (Contenido del sitio → Nuevo → Aplicación). Al añadirla, SharePoint crea las listas con sus columnas y unos datos de ejemplo. Después, en la página, la web part se puede poner en una sección de ancho completo.

> Las listas solo se crean al **añadir la app al sitio**. Si actualizas una versión ya instalada y faltan listas, quita la app del sitio y vuelve a añadirla, o usa los scripts de `scripts/`. Los datos de ejemplo tienen IDs `…-DEMO-…` y un responsable de ejemplo (`demo.owner@example.com`); bórralos o edítalos cuando quieras.

## Modo local (sin SharePoint)

`npm run standalone` genera `dist-standalone/` (`index.html` y `app.js`), una página que guarda sus datos en un archivo JSON que eliges. `npm run standalone:serve` la sirve en `http://localhost:4173` y `npm run standalone:watch` la recompila al cambiar el código. Ver `../docs/MODO_LOCAL.md`.

## Estructura

```
src/
  models/          Tipos y enums (Idea, Initiative, Project, ActionItem, Meeting, Note)
  rules/           Lógica pura y testeable
    businessRules, transitions   Vencimientos, riesgo, cambios de estado permitidos
    validation                   Validación de formularios
    dates, ids, csv, tableView   Fechas sin saltos de zona horaria, ids, CSV, búsqueda/filtro/orden
    transcriptImport/Commit, importPrompt   Importación desde una reunión
    approvals, approvalMessage   Reglas de aprobación (datos) y mensajes de solicitud
    people                       Brechas de habilidad, caducidad de certificaciones, formación atrasada, revisión de artículos y estados
    operations                   Plazos de incidentes, salud y tendencia de KPIs, seguimientos y estados
    finance                      Cifras de presupuestos, OPEX anualizado, alertas de contratos y estados
    governance                   Puntuación de riesgos, estados de riesgos, decisiones, lecciones y revisiones
  entities/        Payloads y columnas de cada lista
  services/        SharePointService (PnPjs) + andamiaje de Graph, Planner y Power Automate
  hooks/           useListItems
  i18n/            Diccionarios en inglés y español
  components/
    shared/        EntityScreen (pantalla genérica de lista), HubData, campos, gráficos
    Dashboard, Ideas, Initiatives, Projects, Actions, Finance (Budgets, CAPEX, OPEX), Vendors (Vendors, Contracts), Operations (Incidents, Changes, Interactions, KPIs), People (Skills, Training, Knowledge base), Governance (Risks, Decisions, Lessons, Reviews), Notes, Import, Help
  config/AppConfig Nombres de las listas de SharePoint
scripts/
  generate-assets.js          Definición única de las listas → XML del paquete
  Provision-ItsdmLists.ps1    Alternativa: crear las listas con PnP (requiere ClientId)
  provision-lists.browser.js  Alternativa: pegar en la consola del navegador
tests/             Reglas, validación, ids, importación, idiomas, hook, pantallas
```

## Listas de SharePoint

Se crean solas al añadir la app. Su definición está en `scripts/generate-assets.js` y el esquema documentado en `../docs/SHAREPOINT_SCHEMA.md`: `IT_01_Ideas`, `IT_02_Initiatives`, `IT_03_Projects`, `IT_04_Actions`, `IT_05_KPIs`, `IT_06_Budgets`, `IT_07_CAPEX`, `IT_08_OPEX`, `IT_09_Vendors`, `IT_10_Contracts`, `IT_11_Risks`, `IT_12_Decisions`, `IT_13_Incidents`, `IT_14_Interactions`, `IT_15_ChangeRequests`, `IT_19_Reviews`, `IT_20_LessonsLearned`, `IT_21_Meetings`, `IT_22_Notes`, `IT_23_Matters`, `IT_24_Areas`, `IT_25_Links`, `IT_26_Entitlements`, `IT_27_NpsResponses`, `IT_28_ServiceMonths`, `IT_29_Catalog`, `IT_30_Stock`, `IT_31_GeniusSessions`, `IT_32_Objectives`, `IT_33_BusinessCases` e `IT_34_WeeklyReviews`. Los nombres están en `src/config/AppConfig.ts`.

## Reglas de negocio

- **Acción vencida:** la fecha límite es anterior a hoy y no está Hecha ni Cancelada. Una acción que vence hoy no está vencida.
- **Proyecto en riesgo:** la previsión supera el presupuesto en más de un 10 %, o su estado es En riesgo.
- **Estados:** solo se ofrecen los cambios permitidos (por ejemplo una idea no pasa de Nueva a Validada). Lo completado y lo cancelado se puede reabrir, salvo las ideas.
- **Archivar** marca como cancelado (las notas, como archivadas) y oculta; **borrar** elimina definitivamente tras confirmar.
- **Conversión de idea a iniciativa:** solo una idea Validada. Si falla la actualización de la idea, la iniciativa creada se elimina.

## Fechas

Las columnas de fecha se leen como el día local en que caen y se escriben a mediodía UTC, para que el día no cambie con la zona horaria.

## Pendiente

Ver `../docs/ROADMAP.md`: Planner, Power Automate y Graph; roles y aprobaciones propios; migración automática de esquemas.
