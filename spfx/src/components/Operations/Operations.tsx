import * as React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import Changes from './Changes';
import Incidents from './Incidents';
import Interactions from './Interactions';
import Kpis from './Kpis';

/** Incidents, changes, interactions and KPIs, one tab with four views. */
const Operations: React.FC = () => {
  const t = useT();
  return (
    <Pivot aria-label={t('nav.operations')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
      <PivotItem headerText={t('nav.incidents')}><Incidents /></PivotItem>
      <PivotItem headerText={t('nav.changes')}><Changes /></PivotItem>
      <PivotItem headerText={t('nav.interactions')}><Interactions /></PivotItem>
      <PivotItem headerText={t('nav.kpis')}><Kpis /></PivotItem>
    </Pivot>
  );
};

export default Operations;
