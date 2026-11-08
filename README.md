# ITSDM — IT Management Hub

Tagline: **Operate · Improve · Innovate**

ITSDM is a SharePoint Framework (SPFx) enterprise management cockpit for IT Service Delivery Management.

## Scope in this MVP
Implemented modules:
- Dashboard
- Ideas
- Initiatives
- Projects
- Actions
- Planner integration abstraction
- Deterministic rule engine

Not implemented yet (roadmap only): Finance, Vendors, People, Genius Help Desk, Operations, ServiceNow integrations, AI modules.

## Architecture
- SPFx web part host (`ITSDM/spfx`)
- React 17 + Fluent UI v8
- TypeScript (version pinned by SPFx 1.23.x toolchain)
- SharePoint Online lists as primary data store
- PnPjs service abstraction for list access
- Graph/Planner/Power Automate services scaffolded for future expansion

## Local development
```bash
cd ITSDM/spfx
npm install
npm run build
npm test
```

## Packaging and deployment
```bash
cd ITSDM/spfx
gulp bundle --ship
gulp package-solution --ship
```
Deploy the generated `.sppkg` to SharePoint Online App Catalog.

## Documentation index
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/SHAREPOINT_SCHEMA.md`
- `docs/PLANNER_INTEGRATION.md`
- `docs/POWER_AUTOMATE.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT.md`
- `docs/ROADMAP.md`
