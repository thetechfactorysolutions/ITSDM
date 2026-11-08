# ITSDM Data Model

## Core entities
- **Idea**: intake and discovery of opportunities
- **Initiative**: approved and managed improvement effort
- **Project**: execution vehicle with scope/timeline/budget/risk
- **Action**: trackable unit of work linked to initiative/project

## Relationships
- Idea → (validated + explicit confirmation) → Initiative
- Initiative 1..* Projects
- Initiative 1..* Actions
- Project 1..* Actions

## Status and rules
- Idea lifecycle state machine enforced by deterministic transition rules
- Project risk can be computed from budget/forecast variance and schedule signals
- Action urgency derived from due date and completion status
