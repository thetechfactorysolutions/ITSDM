# SharePoint Schema

Created by the app itself (a banner offers to create the missing lists; Help has *Check and repair the lists*). The definition is written by `scripts/generate-assets.js` into `src/provisioning/listSchema.json`. Column internal names equal the names below.

## Lists in use

IT_01 to IT_04, IT_07, IT_08, IT_10 and IT_15 also have the seven approval columns: ApprovalRule (Text), ApprovalStatus (Choice: NONE, PENDING, APPROVED, REJECTED), Approver (Text), ApprovalRequestedOn (Date), ApprovalDecidedOn (Date), ApprovalDecidedBy (Text), ApprovalComment (Multiple lines).

### IT_01_Ideas
Title, IdeaId (Text), Description (Multiple lines), Status (Choice: NEW, DISCOVERY, VALIDATED, PLANNED, IN_PROGRESS, PILOT, ROLLOUT, COMPLETED, REJECTED, CANCELLED), OwnerUPN (Text), SponsorUPN (Text), EstimatedValue (Number), TargetDate (Date), Tags (Multiple lines), ConvertedInitiativeId (Text)

### IT_02_Initiatives
Title, InitiativeId (Text), Description (Multiple lines), Status (Choice: DRAFT, ACTIVE, BLOCKED, ON_HOLD, COMPLETED, CANCELLED), OwnerUPN (Text), ProgressPct (Number 0-100), TargetDate (Date), SourceIdeaId (Text), PlannerPlanId (Text)

### IT_03_Projects
Title, ProjectId (Text), InitiativeId (Text), Description (Multiple lines), Status (Choice: PLANNING, ACTIVE, AT_RISK, BLOCKED, ON_HOLD, COMPLETED, CANCELLED), OwnerUPN (Text), StartDate (Date), EndDate (Date), BudgetAmount (Number), ForecastAmount (Number), RiskLevel (Choice: LOW, MEDIUM, HIGH, CRITICAL), PlannerPlanId (Text)

### IT_04_Actions
Title, ActionId (Text), InitiativeId (Text), ProjectId (Text), Description (Multiple lines), Status (Choice: OPEN, IN_PROGRESS, BLOCKED, DONE, CANCELLED), Priority (Choice: LOW, MEDIUM, HIGH, CRITICAL), OwnerUPN (Text), DueDate (Date), CompletedDate (Date), PlannerTaskId (Text)

### IT_05_KPIs
Title (the indicator's name), KpiId (Text), Description (Multiple lines), Category (Choice: SERVICE, DELIVERY, FINANCE, PEOPLE, OTHER), Status (Choice: ACTIVE, RETIRED), Unit (Text), Direction (Choice: HIGHER, LOWER), Target (Number), CurrentValue (Number), PreviousValue (Number, may be empty), MeasuredOn (Date), OwnerUPN (Text), ProjectId (Text). Health and trend are calculated.

### IT_13_Incidents
Title, IncidentId (Text), Description (Multiple lines), Status (Choice: NEW, IN_PROGRESS, ON_HOLD, RESOLVED, CLOSED), Severity (Choice: LOW, MEDIUM, HIGH, CRITICAL), Category (Choice: APPLICATION, INFRASTRUCTURE, NETWORK, SECURITY, ACCESS, OTHER), ReportedBy (Text), AssignedTo (Text), ReportedOn (Date), ResolvedOn (Date), Resolution (Multiple lines), RootCause (Multiple lines), ProjectId (Text), VendorId (Text). The deadline is calculated from ReportedOn and the severity.

### IT_14_Interactions
Title (the subject), InteractionId (Text), InteractionType (Choice: MEETING, CALL, EMAIL, WORKSHOP, OTHER), Status (Choice: LOGGED, FOLLOW_UP, DONE), InteractionDate (Date), ContactName (Text), ContactEmail (Text), Organization (Text), Summary (Multiple lines), NextSteps (Multiple lines), FollowUpDate (Date), OwnerUPN (Text), ProjectId (Text), VendorId (Text), MeetingId (Text)

### IT_15_ChangeRequests
Title, ChangeId (Text), Description (Multiple lines, what changes), Reason (Multiple lines), Status (Choice: DRAFT, SUBMITTED, APPROVED, REJECTED, IMPLEMENTED), ChangeType (Choice: STANDARD, NORMAL, EMERGENCY), Risk (Choice: LOW, MEDIUM, HIGH), PlannedDate (Date), ImplementedDate (Date), BackoutPlan (Multiple lines), OwnerUPN (Text, who requests it), ProjectId (Text)

### IT_06_Budgets
Title, BudgetId (Text), FiscalYear (Number), Description (Multiple lines), Status (Choice: DRAFT, APPROVED, CLOSED), PlannedAmount (Number), OwnerUPN (Text). Committed, paid, remaining and % used are calculated from the expenses that point at the budget.

### IT_07_CAPEX
Title, CapexId (Text), Description (Multiple lines), Status (Choice: PLANNED, COMMITTED, PAID, CANCELLED), Amount (Number), ExpenseDate (Date), InvoiceRef (Text), OwnerUPN (Text), BudgetId (Text), ProjectId (Text), VendorId (Text)

### IT_08_OPEX
Title, OpexId (Text), Description (Multiple lines), Status (Choice: PLANNED, COMMITTED, PAID, CANCELLED), Amount (Number, per occurrence), Frequency (Choice: ONE_OFF, MONTHLY, QUARTERLY, ANNUAL), ExpenseDate (Date), OwnerUPN (Text), BudgetId (Text), ProjectId (Text), VendorId (Text), ContractId (Text)

### IT_09_Vendors
Title (the vendor's name), VendorId (Text), Description (Multiple lines), Status (Choice: ACTIVE, UNDER_REVIEW, INACTIVE), Category (Choice: SOFTWARE, HARDWARE, SERVICES, TELECOM, CLOUD, OTHER), ContactName (Text), ContactEmail (Text), Website (Text), OwnerUPN (Text)

### IT_10_Contracts
Title, ContractId (Text), Description (Multiple lines), Status (Choice: DRAFT, ACTIVE, EXPIRED, TERMINATED), VendorId (Text), StartDate (Date), EndDate (Date), NoticeDays (Number 0-365), AnnualValue (Number), AutoRenew (Choice: NO, YES), OwnerUPN (Text), ProjectId (Text)

### IT_11_Risks
Title, RiskId (Text), Description (Multiple lines), Status (Choice: OPEN, MITIGATING, ACCEPTED, CLOSED), Probability (Choice: LOW, MEDIUM, HIGH), Impact (Choice: LOW, MEDIUM, HIGH), OwnerUPN (Text), Mitigation (Multiple lines), DueDate (Date), ProjectId (Text), InitiativeId (Text), MeetingId (Text)

### IT_12_Decisions
Title, DecisionId (Text), Description (Multiple lines, the context), Rationale (Multiple lines), Status (Choice: PROPOSED, DECIDED, SUPERSEDED), DecidedBy (Text), DecisionDate (Date), ProjectId (Text), InitiativeId (Text), MeetingId (Text)

### IT_16_TeamSkills
Title (the skill's name), SkillId (Text), PersonUPN (Text), Category (Choice: TECHNICAL, PROCESS, TOOLING, SOFT, OTHER), Level (Choice: BASIC, INTERMEDIATE, ADVANCED, EXPERT), TargetLevel (Choice: same four), Status (Choice: ACTIVE, ARCHIVED), LastAssessed (Date), Certification (Text), CertificationExpiry (Date), Notes (Multiple lines). The gap and the certification alert are calculated.

### IT_17_TrainingPlans
Title, TrainingId (Text), Status (Choice: PLANNED, IN_PROGRESS, COMPLETED, CANCELLED), TrainingType (Choice: COURSE, CERTIFICATION, WORKSHOP, SELF_STUDY, MENTORING), PersonUPN (Text), Provider (Text), SkillId (Text, a skill's business id), VendorId (Text), StartDate (Date), DueDate (Date), CompletedDate (Date), Cost (Number, informative), Notes (Multiple lines)

### IT_18_KnowledgeBase
Title, ArticleId (Text), Summary (Multiple lines), Body (Multiple lines), Category (Choice: HOW_TO, RUNBOOK, FAQ, POLICY, REFERENCE), Status (Choice: DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED), OwnerUPN (Text), Tags (Text, comma separated), PublishedOn (Date), ReviewDate (Date), ProjectId (Text), VendorId (Text), IncidentId (Text), plus the seven approval columns (publishing a policy needs an approval).

### IT_19_Reviews
Title, ReviewId (Text), ReviewType (Choice: STATUS, RISK, FINANCIAL, CLOSURE), Status (Choice: SCHEDULED, COMPLETED, CANCELLED), Health (Choice: GREEN, AMBER, RED), ReviewDate (Date), NextReviewDate (Date), Summary (Multiple lines), NextSteps (Multiple lines), OwnerUPN (Text), ProjectId (Text), InitiativeId (Text)

### IT_20_LessonsLearned
Title, LessonId (Text), Description (Multiple lines, what happened), Recommendation (Multiple lines), Category (Choice: PROCESS, TECHNOLOGY, PEOPLE, VENDOR, OTHER), Status (Choice: NEW, REVIEWED, APPLIED), OwnerUPN (Text), ProjectId (Text), InitiativeId (Text), MeetingId (Text)

### IT_21_Meetings
Title, MeetingId (Text), MeetingDate (Date), Summary (Multiple lines), Attendees (Multiple lines), Transcript (Multiple lines), ImportedItems (Multiple lines)

### IT_22_Notes
Title, NoteId (Text), Body (Multiple lines), Category (Choice: DECISION, RISK, INFO, FOLLOW_UP), Status (Choice: ACTIVE, ARCHIVED), MeetingId (Text), InitiativeId (Text), ProjectId (Text)

### IT_23_Matters
Title, MatterId (Text), Description (Multiple lines), Notes (Multiple lines), Status (Choice: INBOX, OPEN, IN_PROGRESS, WAITING, DONE, DISCARDED), Priority (Choice: LOW, MEDIUM, HIGH, CRITICAL), AreaId (Text, the AreaId of an area; empty while in the inbox), Source (Choice: MANUAL, EMAIL, TEAMS, OTHER), SourceRef (Multiple lines, link to the original message), Sender (Text), ReceivedOn (Date), DueDate (Date), ClosedOn (Date), OwnerUPN (Text), ProjectId (Text), ContractId (Text), IncidentId (Text), VendorId (Text). The inbox is this list with Status = INBOX. Attachments are the list's own attachments.

### IT_24_Areas
Title, AreaId (Text), Description (Multiple lines), Status (Choice: ACTIVE, ARCHIVED), SortOrder (Number)

### IT_25_Links
Title, LinkId (Text), Url (Multiple lines; only http and https are accepted by the app), Category (Text), Description (Multiple lines), Pinned (Choice: NO, YES), Status (Choice: ACTIVE, ARCHIVED), VendorId (Text)

### IT_26_Entitlements
Title, EntitlementId (Text), EntitlementType (Choice: WARRANTY, LICENSE, SUPPORT, SUBSCRIPTION), Status (Choice: ACTIVE, EXPIRED, RENEWED, CANCELLED), Product (Text), Reference (Text, a serial or order reference, never a licence key), Quantity (Number), StartDate (Date), EndDate (Date), NoticeDays (Number 0-365), AnnualCost (Number), VendorId (Text), ContractId (Text), OwnerUPN (Text), Notes (Multiple lines). Renewal warning: same rule as contracts.

### IT_27_NpsResponses
Title, ResponseId (Text), Score (Number 0-10), Comment (Multiple lines), RespondedOn (Date), Channel (Choice: KIOSK, PHONE, CHAT, FLOORWALK, SELF_SERVICE, EMAIL, OTHER), Country (Choice: ES, PT, OTHER), TicketRef (Text), Status (Choice: NOT_REQUIRED, PENDING, CONTACTED, CLOSED; the call-back), FollowUpDate (Date), FollowUpNotes (Multiple lines), OwnerUPN (Text, who calls)

### IT_28_ServiceMonths
Title, MonthId (Text), Period (Date, first day of the month), Country (Choice: ES, PT, OTHER), Incidents, Interactions, Requests, Calls, Users (Number), SlaPct (Number 0-100, may be empty), NpsScore (Number -100 to 100, may be empty), NpsResponses, Backlog (Number), Notes (Multiple lines)

### IT_29_Catalog
Title, CatalogId (Text), Category (Choice: ACCESS, EMAIL_TEAMS, ONEDRIVE_SHAREPOINT, DEVICE, ACCESSORY, APPLICATION, NETWORK_WIFI, HOW_TO, LOCATION_PEOPLE, OTHER), Kind (Choice: INCIDENT, INTERACTION, REQUEST), Keywords (Multiple lines, separated by commas), Guidance (Multiple lines), ArticleId (Text), Status (Choice: ACTIVE, ARCHIVED)

### IT_30_Stock
Title, StockId (Text), Category (Choice: LAPTOP, TABLET, PHONE, MONITOR, HEADSET, ACCESSORY, NETWORK, OTHER), Country (Choice: ES, PT, OTHER), OnHand, MinLevel, InUse, OnOrder (Number), ExpectedOn (Date), UnitCost (Number), Ownership (Choice: RENTED, PURCHASED), VendorId (Text), Status (Choice: ACTIVE, ARCHIVED), Notes (Multiple lines)

### IT_31_GeniusSessions
Title, SessionId (Text), SessionType (Choice: CORNER, TIP, ACADEMY, CHALLENGE, ASK_IT), Topic (Text), Status (Choice: IDEA, PLANNED, DELIVERED, CANCELLED), SessionDate (Date), Audience (Text), OwnerUPN (Text, who gives it), Invited, Attended (Number), Satisfaction (Number 0-5, may be empty), MaterialUrl (Multiple lines, http or https), ArticleId (Text), CatalogId (Text), Motivation (Multiple lines)

### IT_32_Objectives
Title, ObjectiveId (Text), Description (Multiple lines), OwnerUPN (Text), SponsorUPN (Text), StartDate (Date), TargetDate (Date), Status (Choice: DRAFT, ACTIVE, ACHIEVED, CANCELLED), Priority (Choice: LOW, MEDIUM, HIGH, CRITICAL), Goal (Multiple lines), KpiId (Text)

### IT_33_BusinessCases
Title, CaseId (Text), Problem, Options, Recommendation, Risks (Multiple lines), EstimatedCost, AnnualBenefit (Number), ObjectiveId, InitiativeId, ProjectId (Text), OwnerUPN (Text), Status (Choice: DRAFT, SUBMITTED, APPROVED, REJECTED, ARCHIVED), DecisionDate (Date), DecisionNotes (Multiple lines), plus the seven approval columns (approving a large case needs an approval, rule `case.approve`). ROI and payback are calculated.

### IT_34_WeeklyReviews
Title, ReviewId (Text), WeekStart (Date, the Monday), Status (Choice: DRAFT, COMPLETED), Happened, WentWell, WentWrong, Attention, Decisions, Risks, Priorities, StopDoing, StartDoing (Multiple lines), OwnerUPN (Text)

### IT_35_PurchaseOrders
Title (the PO number), PoId (Text), VendorId (Text), Amount (Number), Status (Choice: OPEN, CLOSED), Notes (Multiple lines)

### IT_36_Purchases
Title (the product), PurchaseId (Text), Quantity, UnitPrice, Amount (Number), Category (Text, free), VendorId (Text), PoNumber (Text, the Title of a PO), Status (Choice: REQUESTED, APPROVED, ORDERED, RECEIVED, REJECTED, CANCELLED), RequestedBy (Text), RequestedOn, OrderedOn, ReceivedOn (Date), DecisionBy (Text), DecisionDate (Date), DecisionNotes, Reason, Notes (Multiple lines)

### IT_37_PurchaseRoles
Title (a name), UserUPN (Text), Role (Choice: APPROVER, BUYER, REQUESTER, VIEWER), Notes (Multiple lines)

### IT_38_Favorites
Title (the title of the starred item), ListName (Text, the SharePoint name of its list), ItemKey (Text, its id), UserUPN (Text, whose star it is)

### IT_39_FileLinks
Title (the name shown for the file), ListName (Text, the SharePoint name of the record's list), ItemKey (Text, the record's id), Url (Multiple lines, the link to the file)

## Notes
- Attachments use the list attachments of SharePoint; the Help tab has a button that turns them on for lists that were created without them.
- Changing the columns of a list that already exists is not automated (see `ROADMAP.md`).
- Version history is not on by default; the Help tab has a button that turns it on for the lists (needs permission to manage them).
