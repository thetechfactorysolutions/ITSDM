# ITSDM Data Model

## Core entities
- **Idea**: intake and discovery of opportunities
- **Initiative**: approved and managed improvement effort
- **Project**: execution vehicle with scope, timeline, budget and risk
- **Action**: trackable unit of work linked to an initiative and/or project
- **Meeting**: a meeting imported from a transcript, with its summary, transcript and what was created from it
- **Note**: information or a follow-up, linked to a meeting, initiative and/or project
- **Risk**: something that could go wrong, with probability, impact, owner and mitigation
- **Decision**: what was decided, its context, why, who and when
- **Lesson learned**: what happened and what to do next time
- **Review**: a periodic look at a project or initiative, with a health (green, amber, red)
- **Budget**: a yearly amount; the **CAPEX** (investment) and **OPEX** (recurring cost) entries that point at it count against it
- **Incident**, **Change request**, **Interaction** and **KPI**: how the service is running, what is being changed, who we talk to, and how we measure it
- **Vendor** and **Contract**: who we buy from, and the agreement, with its end date and renewal notice

## Relationships
- Idea → (validated + confirmation) → Initiative
- Initiative 1..* Projects; Initiative 1..* Actions; Project 1..* Actions
- Meeting 1..* Notes, risks, decisions and lessons
- Risks, decisions, lessons and reviews can each point at a project and/or an initiative, and appear in their details
- Links are stored as the **business id** of the other item (`InitiativeId`, `ProjectId`, `SourceIdeaId`, `MeetingId`) and chosen from a picker. They are text columns, not SharePoint lookup columns, so existing lists did not need to change.

## Status rules
- **Ideas:** NEW → DISCOVERY → VALIDATED → PLANNED → IN_PROGRESS → PILOT → ROLLOUT → COMPLETED; REJECTED before planning; CANCELLED from most states. Terminal states cannot change.
- **Initiatives, projects, actions:** transition maps in `src/rules/transitions.ts`. Completed and cancelled work can be reopened.
- The form and the table only offer allowed statuses, and a save is checked against the **saved** status, not the value edited in the form.
- When an action becomes DONE its completion date is filled with today (if empty); reopening clears it.
- **Archive** = move to CANCELLED (notes: ARCHIVED). Closed items are hidden unless "Show closed" is on.

## Governance
- **Risk score** = probability (Low 1, Medium 2, High 3) x impact (same scale), from 1 to 9. Level: **Low** up to 2, **Medium** up to 4, **High** from 6. Score and level are calculated, not stored. A risk is *active* until it is Closed; the dashboard counts the active High ones.
- **Risk:** Open → Mitigating / Accepted → Closed (a closed risk can be reopened).
- **Decision:** Proposed → Decided → Superseded. When it becomes Decided, the date (today) and who decided (the user) are filled in if empty.
- **Lesson:** New → Reviewed → Applied.
- **Review:** Scheduled → Completed or Cancelled (can be rescheduled).
- Closed statuses (hidden by default): Closed, Superseded, Applied, Completed, Cancelled.

## Money and vendors
- **Committed** (of a budget) = CAPEX amounts + OPEX **annualised** (amount x 12, 4 or 1 for monthly, quarterly, annual or one-off), for every expense that points at the budget and is not Cancelled. **Paid** is the part already Paid. **Remaining** = planned - committed; **used** = committed / planned. Level: **On track** up to 90%, **Near the limit** from 90% up to 100%, **Over budget** above 100% (spending with nothing planned is over).
- **Expense:** Planned → Committed → Paid, or Cancelled (can return to Planned).
- **Budget:** Draft → Approved → Closed (a closed budget can be reopened as Approved).
- **Vendor:** Active, Under review, Inactive (free between them).
- **Contract:** Draft → Active → Expired or Terminated; an Expired one can be renewed (Active again); Terminated is final.
- **Contract alert:** an Active contract is **due for renewal** when the days left to its end date are within its notice period (90 by default), and **lapsed** when the end date passed but it was never closed.
- Amounts have no currency (as in projects). Closed statuses (hidden by default) now also include Inactive, Expired and Terminated.

## Service and operations
- **Incident deadline** = the day it was reported + the days allowed for its severity (Critical 1, High 3, Medium 7, Low 14; `AppConfig.service.slaDays`). An unresolved incident (anything but Resolved or Closed, On hold included) is **overdue** once today is after that day. Days open run to today while open and to the resolution date once resolved.
- **Incident:** New → In progress ⇄ On hold → Resolved → Closed (a resolved or closed one can be reopened as In progress). Resolving fills the resolution date (today) if empty; reopening clears it.
- **Change request:** Draft → Submitted → Approved or Rejected → Implemented (final). Implementing fills the implementation date. **Approving a high-risk or emergency change needs an approval** (rule `change.approve`).
- **Interaction:** Logged, Follow-up pending, Done. A **follow-up is overdue** when the interaction is waiting for one and its follow-up date has passed.
- **KPI health:** *On target* when the current value meets the target; *At risk* within 10% of it (below it when higher is better, above it when lower is better); *Off target* otherwise. **Trend:** improving, worsening or stable against the previous value, taking the direction into account; no previous value means no trend. Changing the current value on save moves the old one to the previous value and sets the measurement date to today.
- Closed statuses (hidden by default) now also include Resolved, Implemented and Retired.

## People and knowledge
- **Skill gap** = the target level minus the current level, in levels (Basic 1, Intermediate 2, Advanced 3, Expert 4); zero when the person has reached or passed the target. Archived skills do not count.
- **Certification alert:** an active skill with a certification and an expiry date is *expiring* when the days left are within the warning period (60 by default, `AppConfig.people.certificationWarningDays`) and *expired* once the date has passed. The expiry day itself is still valid.
- **Skill:** Active or Archived (free between them). One record is one person in one skill.
- **Training plan:** Planned ⇄ In progress → Completed or Cancelled (a completed one can be reopened as In progress; a cancelled one returns to Planned). Completing fills the completion date (today) if empty; reopening clears it. It is **late** when its due date has passed and it is not Completed or Cancelled. The cost is informative and is not added to any budget.
- **Article:** Draft ⇄ In review → Published → In review or Archived (an archived one can return to Draft). Publishing fills the publication date (today) and a review date (today + 180 days, `AppConfig.knowledge.reviewDays`) if empty. A published article whose review date has passed is **due for review**. **Publishing a policy needs an approval** (rule `article.publishPolicy`).
- Closed statuses (hidden by default) include Archived, Completed and Cancelled for these lists.

## Matters, areas, links and warranties
- **Matter:** one thing that asks for attention. Inbox (unclassified) → Open / In progress / Waiting → Done or Discarded. Leaving the inbox needs an **area**. Done or Discarded fills the closing date (today) and reopening clears it. **Overdue** = open (not in the inbox, not closed) with a due date before today. An inbox item is **stale** after `AppConfig.matters.inboxStaleDays` (3) days.
- **Area:** Active or Archived; an editable topic that matters are grouped by.
- **Link:** a web address, http or https only; pinned links show on the dashboard.
- **Warranty or licence (entitlement):** Active → Expired, Renewed or Cancelled. Same warning as contracts: renewal inside the notice days, lapsed when it ended and is still Active.
- **Agenda:** every date of every open item, in date order (`src/rules/agenda.ts`). Contracts and entitlements give two dates: the decision to renew (end date minus the notice) and the end.

## Service quality, stock, Genius and management
- **NPS answer:** promoter 9-10, passive 7-8, detractor 0-6. **NPS** = % promoters minus % detractors. A detractor starts as *To call*; if nobody has called after `AppConfig.service.npsFollowUpDays` (7) days it is **overdue**. Answers that need no call (*No call needed*) and closed ones are hidden by default.
- **Monthly figures:** by month and country. **Interactions %** = interactions / (incidents + interactions). **Contacts per 100 users** = (incidents + interactions) / users x 100. **SLA low** below `AppConfig.service.slaTarget` (95). A missing SLA or NPS is empty, not zero.
- **Catalogue:** each entry has keywords (case and accents ignored), a kind (incident, interaction or request) and a category. The phrase tester lists the active entries whose keywords appear in the text.
- **Stock:** *Low* when the units on the shelf are at or below the alarm level and the order on its way does not lift them above it; *Ordered* when they are low but the order would. An order is **late** when units are on order and the expected day has passed. A zero alarm level turns the alarm off. Archived products never alarm.
- **Genius session:** Idea → Planned → Delivered (or Cancelled). Attendance = attended / invited. The impact sums delivered sessions: attendees, mean attendance, mean satisfaction. It does not claim that interactions were avoided. Catalogue entries without a live session are suggested as topics.
- **Objective:** Draft → Active → Achieved (or Cancelled). Late when active and past its target date.
- **Business case:** Draft → Submitted → Approved or Rejected. **ROI** (first year) = (annual benefit - cost) / cost. **Payback** = cost / (annual benefit / 12) months. Approving a case of `AppConfig.approvals.highSpend` or more needs an approval (`case.approve`). The decision date (today) is filled in when it is approved or rejected.
- **Weekly review:** the week starts on Monday. If the person has used it before and nothing completed covers last week, the dashboard says so.

## Approvals
Ideas, initiatives, projects and actions carry one active approval (`ApprovalRule`, `ApprovalStatus` NONE/PENDING/APPROVED/REJECTED, `Approver`, `ApprovalRequestedOn`, `ApprovalDecidedOn`, `ApprovalDecidedBy`, `ApprovalComment`). Which changes need one is defined as data in `src/rules/approvals.ts`; see `APROBACIONES.md`.

## Derived values
- Overdue: due day before today and not DONE/CANCELLED (an action due today is not overdue).
- Project at risk: forecast above budget by more than 10%, or status AT_RISK.

## Dates
Dates are handled as calendar days (`YYYY-MM-DD`). A stored timestamp is read as the local day it falls on; a day is written as noon UTC so it never moves to a neighbouring day.

## Ids
Readable ids `PREFIX-YYYYMMDD-XXXXXX` (e.g. `IDEA-20261108-K3F9QZ`), generated by the app and not editable afterwards.

## Items created from a meeting
They start in the first status of their kind (NEW, DRAFT, PLANNING, OPEN, ACTIVE), the description ends with `[Source: MEET-…]` (`[Origen: …]` in Spanish), and the meeting stores the list of what was created in `ImportedItems`.
