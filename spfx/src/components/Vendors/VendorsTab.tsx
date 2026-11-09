import * as React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import Contracts from './Contracts';
import Entitlements from './Entitlements';
import Vendors from './Vendors';

/** Vendors, contracts, and warranties and licences, one tab with three views. */
const VendorsTab: React.FC = () => {
  const t = useT();
  return (
    <Pivot aria-label={t('nav.vendorsTab')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
      <PivotItem headerText={t('nav.vendors')}><Vendors /></PivotItem>
      <PivotItem headerText={t('nav.contracts')}><Contracts /></PivotItem>
      <PivotItem headerText={t('nav.entitlements')}><Entitlements /></PivotItem>
    </Pivot>
  );
};

export default VendorsTab;
