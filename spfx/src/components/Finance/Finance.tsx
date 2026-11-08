import * as React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import Budgets from './Budgets';
import Capex from './Capex';
import Opex from './Opex';

/** Budgets, CAPEX and OPEX, one tab with three views. */
const Finance: React.FC = () => {
  const t = useT();
  return (
    <Pivot aria-label={t('nav.finance')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
      <PivotItem headerText={t('nav.budgets')}><Budgets /></PivotItem>
      <PivotItem headerText={t('nav.capex')}><Capex /></PivotItem>
      <PivotItem headerText={t('nav.opex')}><Opex /></PivotItem>
    </Pivot>
  );
};

export default Finance;
