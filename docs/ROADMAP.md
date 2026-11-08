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

## Aplazado tras la ronda 2 (pendiente de retomar)
Quedó fuera a propósito. Para retomarlo, pedir "retoma el roadmap".
- **Integraciones:** Planner (crear plan/tarea al activar iniciativas y proyectos), Power Automate (avisos de acciones vencidas y proyectos en riesgo, resumen semanal) y Microsoft Graph (perfil, foto, calendario). Necesitan permisos y flujos del tenant.
- **Roles propios dentro de la aplicación.** Hoy mandan los permisos de SharePoint. (Las **aprobaciones** ya están hechas: ver `docs/APROBACIONES.md`. Quedan fuera los flujos de varios aprobadores y el envío automático de avisos, que dependen de Power Automate.)
- **Las 7 listas restantes sin interfaz** (`IT_05`, `IT_13` a `IT_18`), por fases: **servicio y operación** (KPIs, incidentes, interacciones, cambios); **personas y conocimiento** (habilidades, formación, base de conocimiento).
- **Migración de esquemas:** cambiar columnas de listas ya creadas sin borrarlas.
- **Responsable como columna de persona** de SharePoint (hoy es el email en texto) y **columnas de búsqueda** reales entre listas.
- **Datos de ejemplo opcionales** al instalar y paquetes separados para sandbox y producción.
- **Llamada a una IA desde la propia app** (hoy solo se importa el resultado), si en el futuro hay un servicio aprobado.

## Explicit non-MVP scope
Finance, Vendors, People, Genius Help Desk, Operations, ServiceNow, and AI are **not implemented** in this release and remain roadmap items.
