# Deployment to SharePoint Online

Requires Node 22 (`spfx/.nvmrc`).

1. Build the package: from `spfx`, run `npm install` once, then `npm run package`. This generates the list definitions, bundles the code and creates `spfx/sharepoint/solution/itsdm.sppkg`.
2. Upload the `.sppkg` to the tenant App Catalog (replace the previous version if there is one) and deploy it.
3. **Add the app to the site** (Site contents → New → App). Adding it creates the lists and sample items.
4. Add the **IT Management Hub** web part to a page. It can be placed in a **full-width section** (Edit page → section layout → Full-width).
5. Optional: in the web part properties, force the language (Auto, Español or English).
6. Optional: in the Help tab, press "Enable version history" (needs permission to manage the lists).

## Updating a site that already has the app
New lists are created when the app is added to the site, not when its version is updated. To get `IT_21_Meetings` and `IT_22_Notes` on a site that already had the app:
- remove the app from the site and add it again, **or**
- create the lists by running `spfx/scripts/Provision-ItsdmLists.ps1` or pasting `spfx/scripts/provision-lists.browser.js` in the browser console of the site.

What happens to lists that already exist when the app is re-added has **not been tested** in a tenant. If in doubt, delete the sample lists first, or use the scripts above, which skip lists and columns that already exist.

## Sample data
The package creates sample items (ids with `DEMO`, example owner `demo.owner@example.com`). Delete them from the lists whenever you like. Dates are relative to the day the package was built.

## Continuous integration
`.github/workflows/ci.yml` installs, lints, tests and packages on every push and keeps the `.sppkg` as a build artifact.
