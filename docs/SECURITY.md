# Security

- Authentication: Microsoft 365 / SharePoint Online native authentication. No custom credential flow.
- Authorization: the app acts as the signed-in user, so SharePoint permissions on the lists decide who can read, create, edit and delete. There are no app-level roles; give people access with the site and list permissions.
- No secrets, tokens or passwords in source code.
- Approvals are recorded with who decided and when, but anyone with edit permission on a list can record a decision. To separate who requests from who approves, restrict list permissions in SharePoint.
- **No data leaves the tenant.** The app does not call any AI or external service. Transcripts are interpreted by the user's own AI outside the app, and only the result is pasted in; the original transcript is stored in the `IT_21_Meetings` list only if the user pastes it.
- Meeting transcripts can be sensitive: restrict the permissions of `IT_21_Meetings` (and `IT_22_Notes`) accordingly.
- CSV export neutralises cells that start with `=`, `+`, `-` or `@` so Excel does not run them as formulas.
- Errors shown to users are short messages, never stack traces.
- Principle of least privilege for any future Graph scopes (not used today).
- Deleting is permanent and asks for confirmation; "Archive" is the reversible alternative. Version history (Help tab) lets you see who changed what.
