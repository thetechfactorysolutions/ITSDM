export interface IPlannerPlanLink {
  plannerPlanId?: string;
}

export interface IPlannerTaskLink {
  plannerTaskId?: string;
}

export class PlannerService {
  public async validatePlanLink(planId: string): Promise<boolean> {
    return Promise.resolve(planId.trim().length > 0);
  }

  public async validateTaskLink(taskId: string): Promise<boolean> {
    return Promise.resolve(taskId.trim().length > 0);
  }

  public async linkPlanId(planId: string | undefined): Promise<IPlannerPlanLink> {
    return Promise.resolve({ plannerPlanId: planId?.trim() || undefined });
  }

  public async linkTaskId(taskId: string | undefined): Promise<IPlannerTaskLink> {
    return Promise.resolve({ plannerTaskId: taskId?.trim() || undefined });
  }

  // TODO: add Graph-backed plan/task creation for initiatives/projects.
  // TODO: add Graph-backed task provisioning and full Planner sync reconciliation.
}
