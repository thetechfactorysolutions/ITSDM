# IT Management Hub (`itsdm`)

Web part de SharePoint Framework (SPFx 1.23.2, React 17, Fluent UI 8) para que un responsable de TI gestione su portfolio. Funciona en páginas de SharePoint, a pantalla completa y en Teams.

Flujo de negocio: **Idea → Iniciativa → Proyecto → Acción**, con un **Dashboard** que resume lo vencido y lo que está en riesgo.

## Requisitos

- **Node 22** (`>=22.14.0 <23`). SPFx 1.23 no arranca con Node 18 ni con Node 24. La versión fijada está en `.nvmrc`.
- Una web de SharePoint con las listas descritas más abajo.

```bash
nvm use 22.14.0
npm install
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npx gulp serve` | Servidor local para el workbench de SharePoint |
| `npx gulp bundle --ship` | Compila y empaqueta en `dist/` (producción) |
| `npx gulp package-solution --ship` | Genera `sharepoint/solution/itsdm.sppkg` para subir al catálogo de aplicaciones |
| `npm test` | Lint + compilación + tests (reglas, validación, IDs y hook de listas) |

Despliegue: `bundle --ship` → `package-solution --ship` → subir `sharepoint/solution/itsdm.sppkg` al catálogo de aplicaciones y añadir el web part a una página.

## Estructura

```
src/
  models/          Tipos y enums de Idea, Initiative, Project, ActionItem
  rules/           Lógica pura y testeable
    businessRules  Vencimientos, riesgo por desviación, transiciones de idea
    validation     Validación de formularios
    dates          Fechas como días (YYYY-MM-DD), sin saltos de zona horaria
    ids            Generador de IDs de negocio (IDEA-20261108-K3F9QZ)
  services/        SharePointService (PnPjs) + andamiaje de Graph, Planner y Power Automate
  hooks/           useListItems: carga, creación, edición y borrado de una lista
  components/
    shared/        HubData (datos compartidos), DateField, UserField, KpiTile, mappers
    Dashboard, Ideas, Initiatives, Projects, Actions
  config/AppConfig Nombres de las listas de SharePoint
tests/             Tests de reglas, validación, IDs y del hook
```

Las listas se cargan una vez para todo el web part (`HubData`) y las pestañas comparten ese estado.

## Listas de SharePoint

Los nombres están en `src/config/AppConfig.ts`. La app lee las listas por **título**. Hoy se usan 4 de las 20 definidas; el resto está reservado para fases futuras.

> Este esquema se ha deducido del código (`mappers.ts` y los `buildPayload` de cada pestaña), no de una lista real. Los tipos de columna son los que el código espera; revísalos al crear las listas.

Columnas comunes a las cuatro: `Title` (texto), `Description` (texto multilínea), `Status` (texto o elección), `OwnerUPN` (texto con el email del responsable).

| Lista | Columnas propias |
| --- | --- |
| `IT_01_Ideas` | `IdeaId` (texto), `SponsorUPN` (texto), `EstimatedValue` (número), `TargetDate` (fecha), `Tags` (texto, separado por comas), `ConvertedInitiativeId` (texto) |
| `IT_02_Initiatives` | `InitiativeId` (texto), `ProgressPct` (número 0–100), `TargetDate` (fecha), `SourceIdeaId` (texto), `PlannerPlanId` (texto) |
| `IT_03_Projects` | `ProjectId` (texto), `InitiativeId` (texto), `StartDate` y `EndDate` (fecha), `BudgetAmount` y `ForecastAmount` (número), `RiskLevel` (texto o elección), `PlannerPlanId` (texto) |
| `IT_04_Actions` | `ActionId` (texto), `InitiativeId` y `ProjectId` (texto), `Priority` (texto o elección), `DueDate` y `CompletedDate` (fecha), `PlannerTaskId` (texto) |

Valores esperados de `Status`:

- **Ideas:** NEW, DISCOVERY, VALIDATED, PLANNED, IN_PROGRESS, PILOT, ROLLOUT, COMPLETED, REJECTED, CANCELLED
- **Iniciativas:** DRAFT, ACTIVE, BLOCKED, ON_HOLD, COMPLETED, CANCELLED
- **Proyectos:** PLANNING, ACTIVE, AT_RISK, BLOCKED, ON_HOLD, COMPLETED, CANCELLED
- **Acciones:** OPEN, IN_PROGRESS, BLOCKED, DONE, CANCELLED. `Priority`: LOW, MEDIUM, HIGH, CRITICAL

## Reglas de negocio

- **Acción vencida:** la fecha límite es anterior a hoy y no está DONE ni CANCELLED. Una acción que vence hoy no está vencida.
- **Proyecto en riesgo:** el forecast supera el presupuesto en más de un 10 %, o su estado es AT_RISK.
- **Transiciones de idea:** solo se permiten los pasos definidos en `businessRules.ts` (por ejemplo NEW → DISCOVERY, no NEW → VALIDATED).
- **Conversión a iniciativa:** solo una idea VALIDATED. Si falla la actualización de la idea, la iniciativa creada se elimina.

## Fechas

Las columnas de fecha se leen como el día local en que caen y se escriben a mediodía UTC, para que el día no cambie con la zona horaria.

## Pendiente

- Script de creación de las listas y columnas (PnP).
- Integración real con Graph, Planner y Power Automate (hoy son andamiaje).
- Textos localizados (la interfaz está en inglés fijo).
- Las 16 listas restantes de `AppConfig` no tienen interfaz.
