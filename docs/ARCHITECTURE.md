# ITSDM Architecture

## Core stack
- SPFx 1.23.x web part (SharePoint Online)
- React 17.0.1 UI layer
- Fluent UI v8 component system
- TypeScript toolchain resolved from SPFx generator

## Layers
1. **Presentation**: React module screens (Dashboard, Ideas, Initiatives, Actions, Projects)
2. **Hooks layer**: React hooks encapsulating loading/error/retry patterns
3. **Services layer**:
   - `SharePointService` (PnPjs, CRUD/filter/pagination/error handling)
   - `PlannerService` (plan/task ID abstraction only in MVP)
   - `GraphService` skeleton
   - `PowerAutomateService` skeleton
4. **Rules layer**: deterministic business rules, testable and UI-independent

## Integrations
- Current: SharePoint Online lists
- Near-term: Planner ID linkage for initiatives/projects/actions
- Future: Graph-driven Planner sync, Power Automate flows, Teams notifications
- Roadmap only: ServiceNow and other enterprise integrations

## Deployment model
- Standard `.sppkg` deployment through tenant App Catalog
- M365-native authentication only (no custom auth)
