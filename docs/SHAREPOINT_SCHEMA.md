# SharePoint Schema

## MVP lists (implemented)

### IT_01_Ideas
- Title (Single line)
- IdeaId (Single line)
- Description (Multiple lines)
- Status (Choice: NEW, DISCOVERY, VALIDATED, PLANNED, IN_PROGRESS, PILOT, ROLLOUT, COMPLETED, REJECTED, CANCELLED)
- OwnerUPN (Single line)
- SponsorUPN (Single line)
- EstimatedValue (Currency/Number)
- TargetDate (Date)
- Tags (Multiple lines)
- ConvertedInitiativeId (Single line)

### IT_02_Initiatives
- Title (Single line)
- InitiativeId (Single line)
- Description (Multiple lines)
- Status (Choice)
- OwnerUPN (Single line)
- ProgressPct (Number)
- TargetDate (Date)
- PlannerPlanId (Single line)
- SourceIdeaId (Single line)

### IT_03_Projects
- Title (Single line)
- ProjectId (Single line)
- InitiativeId (Single line)
- Description (Multiple lines)
- Status (Choice)
- OwnerUPN (Single line)
- StartDate (Date)
- EndDate (Date)
- BudgetAmount (Currency/Number)
- ForecastAmount (Currency/Number)
- RiskLevel (Choice)
- PlannerPlanId (Single line)

### IT_04_Actions
- Title (Single line)
- ActionId (Single line)
- InitiativeId (Single line)
- ProjectId (Single line)
- Description (Multiple lines)
- Status (Choice)
- Priority (Choice)
- OwnerUPN (Single line)
- DueDate (Date)
- CompletedDate (Date)
- PlannerTaskId (Single line)

## Future lists (documented only, not implemented)
- IT_05_KPIs
- IT_06_Budgets
- IT_07_CAPEX
- IT_08_OPEX
- IT_09_Vendors
- IT_10_Contracts
- IT_11_Risks
- IT_12_Decisions
- IT_13_Incidents
- IT_14_Interactions
- IT_15_ChangeRequests
- IT_16_TeamSkills
- IT_17_TrainingPlans
- IT_18_KnowledgeBase
- IT_19_Reviews
- IT_20_LessonsLearned
