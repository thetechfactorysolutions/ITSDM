# SharePoint Schema

Created automatically when the app is added to a site (`scripts/generate-assets.js` generates the files packed in the `.sppkg`). Column internal names equal the names below.

## Lists in use

IT_01 to IT_04 also have the seven approval columns: ApprovalRule (Text), ApprovalStatus (Choice: NONE, PENDING, APPROVED, REJECTED), Approver (Text), ApprovalRequestedOn (Date), ApprovalDecidedOn (Date), ApprovalDecidedBy (Text), ApprovalComment (Multiple lines).

### IT_01_Ideas
Title, IdeaId (Text), Description (Multiple lines), Status (Choice: NEW, DISCOVERY, VALIDATED, PLANNED, IN_PROGRESS, PILOT, ROLLOUT, COMPLETED, REJECTED, CANCELLED), OwnerUPN (Text), SponsorUPN (Text), EstimatedValue (Number), TargetDate (Date), Tags (Multiple lines), ConvertedInitiativeId (Text)

### IT_02_Initiatives
Title, InitiativeId (Text), Description (Multiple lines), Status (Choice: DRAFT, ACTIVE, BLOCKED, ON_HOLD, COMPLETED, CANCELLED), OwnerUPN (Text), ProgressPct (Number 0-100), TargetDate (Date), SourceIdeaId (Text), PlannerPlanId (Text)

### IT_03_Projects
Title, ProjectId (Text), InitiativeId (Text), Description (Multiple lines), Status (Choice: PLANNING, ACTIVE, AT_RISK, BLOCKED, ON_HOLD, COMPLETED, CANCELLED), OwnerUPN (Text), StartDate (Date), EndDate (Date), BudgetAmount (Number), ForecastAmount (Number), RiskLevel (Choice: LOW, MEDIUM, HIGH, CRITICAL), PlannerPlanId (Text)

### IT_04_Actions
Title, ActionId (Text), InitiativeId (Text), ProjectId (Text), Description (Multiple lines), Status (Choice: OPEN, IN_PROGRESS, BLOCKED, DONE, CANCELLED), Priority (Choice: LOW, MEDIUM, HIGH, CRITICAL), OwnerUPN (Text), DueDate (Date), CompletedDate (Date), PlannerTaskId (Text)

### IT_11_Risks
Title, RiskId (Text), Description (Multiple lines), Status (Choice: OPEN, MITIGATING, ACCEPTED, CLOSED), Probability (Choice: LOW, MEDIUM, HIGH), Impact (Choice: LOW, MEDIUM, HIGH), OwnerUPN (Text), Mitigation (Multiple lines), DueDate (Date), ProjectId (Text), InitiativeId (Text), MeetingId (Text)

### IT_12_Decisions
Title, DecisionId (Text), Description (Multiple lines, the context), Rationale (Multiple lines), Status (Choice: PROPOSED, DECIDED, SUPERSEDED), DecidedBy (Text), DecisionDate (Date), ProjectId (Text), InitiativeId (Text), MeetingId (Text)

### IT_19_Reviews
Title, ReviewId (Text), ReviewType (Choice: STATUS, RISK, FINANCIAL, CLOSURE), Status (Choice: SCHEDULED, COMPLETED, CANCELLED), Health (Choice: GREEN, AMBER, RED), ReviewDate (Date), NextReviewDate (Date), Summary (Multiple lines), NextSteps (Multiple lines), OwnerUPN (Text), ProjectId (Text), InitiativeId (Text)

### IT_20_LessonsLearned
Title, LessonId (Text), Description (Multiple lines, what happened), Recommendation (Multiple lines), Category (Choice: PROCESS, TECHNOLOGY, PEOPLE, VENDOR, OTHER), Status (Choice: NEW, REVIEWED, APPLIED), OwnerUPN (Text), ProjectId (Text), InitiativeId (Text), MeetingId (Text)

### IT_21_Meetings
Title, MeetingId (Text), MeetingDate (Date), Summary (Multiple lines), Attendees (Multiple lines), Transcript (Multiple lines), ImportedItems (Multiple lines)

### IT_22_Notes
Title, NoteId (Text), Body (Multiple lines), Category (Choice: DECISION, RISK, INFO, FOLLOW_UP), Status (Choice: ACTIVE, ARCHIVED), MeetingId (Text), InitiativeId (Text), ProjectId (Text)

## Future lists (documented only, not implemented)
IT_05_KPIs, IT_06_Budgets, IT_07_CAPEX, IT_08_OPEX, IT_09_Vendors, IT_10_Contracts, IT_13_Incidents, IT_14_Interactions, IT_15_ChangeRequests, IT_16_TeamSkills, IT_17_TrainingPlans, IT_18_KnowledgeBase

## Notes
- Changing the columns of a list that already exists is not automated (see `ROADMAP.md`).
- Version history is not on by default; the Help tab has a button that turns it on for the lists (needs permission to manage them).
