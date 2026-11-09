# Deployment to SharePoint Online

Requires Node 22 (`spfx/.nvmrc`).

1. Build the package: from `spfx`, run `npm install` once, then `npm run package`. This generates the list definitions, bundles the code and creates `spfx/sharepoint/solution/itsdm.sppkg`.
2. Upload the `.sppkg` to the tenant App Catalog (replace the previous version if there is one) and deploy it.
3. **Add the app to the site** (Site contents → New → App). Adding it creates the lists and sample items.
4. Add the **IT Management Hub** web part to a page. It can be placed in a **full-width section** (Edit page → section layout → Full-width).
5. Optional: in the web part properties, force the language (Auto, Español or English).
6. Optional: in the Help tab, press "Enable version history" (needs permission to manage the lists).

## Lists
Since version 1.10 the package **does not create the lists when the app is added** (that failed on a site that already had some of them and asked to delete them). The app creates them itself:
- When some list is missing, a banner at the top of the app offers **Create the missing lists**. It creates only what is missing, with all its columns, and nothing that exists is touched or deleted. You need permission to manage the lists of the site (site owner).
- The Help tab has **Check and repair the lists**: it also adds columns that a list is missing (for example after an update that adds a column).
- The package no longer includes sample items. To try the app with sample data use the local mode, or import your own files (every screen has *Import CSV* with a downloadable template).
- You can still create the lists with `spfx/scripts/Provision-ItsdmLists.ps1` or by pasting `spfx/scripts/provision-lists.browser.js` in the console of the site; both skip what already exists.

To update: upload the new `.sppkg` to the app catalog (replace the existing one) and, if the site asks, update the app there. You do not have to remove the app or delete any list.

## Continuous integration
`.github/workflows/ci.yml` installs, lints, tests and packages on every push and keeps the `.sppkg` as a build artifact.
