export interface IFlowTriggerPayload {
  flowName: string;
  payload: Record<string, unknown>;
}

export class PowerAutomateService {
  public async triggerFlow(_request: IFlowTriggerPayload): Promise<void> {
    throw new Error('PowerAutomateService is scaffolded only. Implement flow integration in a future phase.');
  }
}
