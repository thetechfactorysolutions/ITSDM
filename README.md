# ITSDM — IT Management Hub

Tagline: **Operate · Improve · Innovate**

ITSDM is a SharePoint Framework (SPFx) web part for IT Service Delivery Management. It tracks **ideas, initiatives, projects and actions**, keeps **notes and meetings**, and can turn the result of an AI summary of a meeting transcript into items in the right place.

## What it does
- **Dashboard:** counters, "My work" with quick close, charts of actions by status and budget vs forecast.
- **Ideas → Initiatives → Projects → Actions:** create, edit, details, archive, delete, search, filter, sort, export/import CSV, links chosen from a picker, status rules.
- **Approvals:** rules (defined as data, easy to extend) that block changes such as validating an idea or going over budget until someone approves; the request goes by ready-made email or Teams message (`docs/APROBACIONES.md`).
- **Operations:** incidents with a deadline by severity, change requests (risky ones need approval), interactions with follow-ups, and KPIs with health and trend.
- **Finance and vendors:** budgets whose committed amount is calculated from the CAPEX and OPEX linked to them (with warnings near and over the limit), vendors, and contracts with renewal alerts. Large commitments need approval.
- **Team and knowledge:** skills per person with the level reached and expected (gap), certifications with expiry alerts, training plans, and a knowledge base of articles, runbooks and policies with review dates (publishing a policy needs approval).
- **Governance:** risks (with a probability x impact score), decisions, lessons learned and reviews, linked to projects, initiatives and meetings.
- **Notes and Meetings:** decisions, risks, information and follow-ups linked to a meeting, initiative or project.
- **Import from a meeting:** copy an instruction, run it with your own AI on the transcript, paste the result, review a preview and confirm. The app never calls an AI service (see `docs/IMPORTAR_REUNIONES.md`).
- **Matters, inbox and agenda:** everything that asks for attention lands in an inbox (from Power Automate flows for email and Teams, or added by hand), is classified by area, and moves to the history when closed; an agenda gathers every date, links to the pages you use, warranties and licences with renewal warnings, attachments on any list and project templates (`docs/ASUNTOS.md`).
- **Service quality:** NPS with the call-back of each detractor, monthly figures by country that can be compared fairly, and a classification catalogue (incident, interaction or request) with a phrase tester.
- **Devices and Genius:** device stock with an alarm level and orders on their way, and Genius Help Desk sessions with their impact.
- **Strategy and management:** objectives, business cases with ROI, payback and approval, and a weekly review (`docs/superpowers/specs/2026-11-09-modulos-servicio-diseno.md`).
- **Easy data entry:** every screen can import a CSV and offers a ready-to-fill template (the column names and an example row, with ";" for Spanish Excel).
- **Full-width section** support, **English and Spanish**, keyboard and screen-reader friendly.
- Lists and sample data are created when the app is added to a site.
- **Local mode (prototype):** the same app as a plain web page that keeps its data in a JSON file you choose, for example in your OneDrive folder, with no SharePoint and no installation (`docs/MODO_LOCAL.md`, `npm run standalone` in `spfx/`).

Not implemented yet (see `docs/ROADMAP.md`): Planner and Graph integrations (automatic alerts are documented as Power Automate recipes in `docs/POWER_AUTOMATE.md`), app-level roles beyond purchases, automatic schema migration. All 38 lists have their screen (36 tables with a summary strip, stars and quick search: `docs/PANELES.md`). Purchase requests, purchase orders and their roles are in `docs/PEDIDOS.md`.

## Architecture
- SPFx web part host (`spfx/`), React 17 + Fluent UI v8, TypeScript, PnPjs
- SharePoint Online lists as the data store
- Pure, tested rule layer (`spfx/src/rules`)

## Local development
Requires **Node 22** (`spfx/.nvmrc`).
```bash
cd spfx
npm install
npm test
```

## Packaging and deployment
```bash
cd spfx
npm run package
```
Upload `spfx/sharepoint/solution/itsdm.sppkg` to the App Catalog, then **add the app to the site** (that is what creates the lists). Details in `docs/DEPLOYMENT.md`.

## Documentation index
- `docs/IMPORTAR_REUNIONES.md` — how the meeting import works, with an example
- `docs/APROBACIONES.md` — approval rules and how to add one
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/SHAREPOINT_SCHEMA.md`
- `docs/DEPLOYMENT.md`
- `docs/SECURITY.md`
- `docs/PLANNER_INTEGRATION.md`
- `docs/POWER_AUTOMATE.md`
- `docs/ROADMAP.md`
- `docs/superpowers/specs/2026-11-08-ronda-2-diseno.md` — design of the latest round
