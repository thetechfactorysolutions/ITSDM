import * as React from 'react';
import { PurchaseRoleType } from '../../models';
import { roleOf } from '../../rules/purchases';
import { useHubData } from '../shared/HubData';

/**
 * The role of the person using the app. While the list of roles loads the person can only look, so a
 * screen never shows an approval button for a moment to someone who is not an approver.
 */
export const usePurchaseRole = (): PurchaseRoleType => {
  const { userEmail, purchaseRoles } = useHubData();
  return React.useMemo(
    () => (purchaseRoles.loading ? PurchaseRoleType.VIEWER : roleOf(userEmail, purchaseRoles.items)),
    [userEmail, purchaseRoles.loading, purchaseRoles.items]
  );
};
