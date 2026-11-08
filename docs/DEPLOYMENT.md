# Deployment to SharePoint Online App Catalog

1. Build and package:
   - `gulp bundle --ship`
   - `gulp package-solution --ship`
2. Upload `.sppkg` from `sharepoint/solution/` to tenant App Catalog.
3. Trust/deploy package as appropriate.
4. Add **ItManagementHub** web part to target site/page.
