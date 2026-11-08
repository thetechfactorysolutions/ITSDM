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

## Aplazado tras la ronda 2 (pendiente de retomar)
Quedó fuera a propósito. Para retomarlo, pedir "retoma el roadmap".
- **Integraciones:** Planner (crear plan/tarea al activar iniciativas y proyectos), Power Automate (avisos de acciones vencidas y proyectos en riesgo, resumen semanal) y Microsoft Graph (perfil, foto, calendario). Necesitan permisos y flujos del tenant.
- **Roles y aprobaciones propios:** validación de ideas, cambios de presupuesto. Hoy se usan los permisos de SharePoint.
- **Las 16 listas sin interfaz** (`IT_05` a `IT_20`): KPIs, presupuestos, CAPEX/OPEX, proveedores, contratos, riesgos, decisiones, incidentes, interacciones, cambios, habilidades, formación, conocimiento, revisiones y lecciones aprendidas.
- **Migración de esquemas:** cambiar columnas de listas ya creadas sin borrarlas.
- **Responsable como columna de persona** de SharePoint (hoy es el email en texto) y **columnas de búsqueda** reales entre listas.
- **Datos de ejemplo opcionales** al instalar y paquetes separados para sandbox y producción.
- **Llamada a una IA desde la propia app** (hoy solo se importa el resultado), si en el futuro hay un servicio aprobado.

## Explicit non-MVP scope
Finance, Vendors, People, Genius Help Desk, Operations, ServiceNow, and AI are **not implemented** in this release and remain roadmap items.
