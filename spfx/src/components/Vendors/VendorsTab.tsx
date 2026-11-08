import * as React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import Contracts from './Contracts';
import Vendors from './Vendors';

/** Vendors and contracts, one tab with two views. */
const VendorsTab: React.FC = () => {
  const t = useT();
  return (
    <Pivot aria-label={t('nav.vendorsTab')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
      <PivotItem headerText={t('nav.vendors')}><Vendors /></PivotItem>
      <PivotItem headerText={t('nav.contracts')}><Contracts /></PivotItem>
    </Pivot>
  );
};

export default VendorsTab;
