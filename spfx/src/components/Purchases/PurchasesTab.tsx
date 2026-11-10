import * as React from 'react';
import { MessageBar, Pivot, PivotItem, Stack } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { PurchaseRoleType } from '../../models';
import { isApprover } from '../../rules/purchases';
import PurchaseOrders from './PurchaseOrders';
import PurchaseRoles from './PurchaseRoles';
import Purchases from './Purchases';
import { usePurchaseRole } from './usePurchaseRole';

/** Requests, purchase orders and roles. The requester sees only the requests: the money and the roles are not theirs. */
const PurchasesTab: React.FC = () => {
  const t = useT();
  const role = usePurchaseRole();
  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <MessageBar>{t('purchase.yourRole', { role: t(`role.${role}`) })} {t(`purchase.roleHint.${role}`)}</MessageBar>
      <Pivot aria-label={t('nav.purchases')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
        <PivotItem headerText={t('purchase.tabRequests')}><Purchases /></PivotItem>
        {role !== PurchaseRoleType.REQUESTER && <PivotItem headerText={t('purchase.tabPos')}><PurchaseOrders /></PivotItem>}
        {isApprover(role) && <PivotItem headerText={t('purchase.tabRoles')}><PurchaseRoles /></PivotItem>}
      </Pivot>
    </Stack>
  );
};

export default PurchasesTab;
