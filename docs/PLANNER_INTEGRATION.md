# Planner Integration

## MVP approach
- Keep Planner integration abstracted in service layer.
- Store `plannerPlanId` on Initiatives and Projects.
- Store `plannerTaskId` on Actions.
- Do not auto-create plans/tasks in MVP.

## Future approach
- Microsoft Graph-based synchronization layer
- Mapping between SharePoint item IDs and Planner artifacts
- Reconciliation and conflict strategies
