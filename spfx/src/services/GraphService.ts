import { WebPartContext } from '@microsoft/sp-webpart-base';

export class GraphService {
  public constructor(private readonly _context: WebPartContext) {}

  public async isAvailable(): Promise<boolean> {
    return Promise.resolve(!!this._context.msGraphClientFactory);
  }

  public async getCurrentUserProfile(): Promise<unknown> {
    throw new Error('GraphService is scaffolded only. Implement graph calls in a future phase.');
  }
}
