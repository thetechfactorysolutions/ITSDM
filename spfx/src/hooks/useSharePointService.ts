import { useMemo } from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SharePointService } from '../services/SharePointService';

export const useSharePointService = (context: WebPartContext): SharePointService => {
  return useMemo(() => new SharePointService(context), [context]);
};
