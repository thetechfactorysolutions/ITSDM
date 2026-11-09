import * as React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import Catalog from './Catalog';
import Changes from './Changes';
import Incidents from './Incidents';
import Interactions from './Interactions';
import Kpis from './Kpis';
import Nps from './Nps';
import ServiceMonths from './ServiceMonths';

/** Incidents, changes, interactions, KPIs, NPS, monthly figures and the classification catalogue, one tab with seven views. */
const Operations: React.FC = () => {
  const t = useT();
  return (
    <Pivot aria-label={t('nav.operations')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
      <PivotItem headerText={t('nav.incidents')}><Incidents /></PivotItem>
      <PivotItem headerText={t('nav.changes')}><Changes /></PivotItem>
      <PivotItem headerText={t('nav.interactions')}><Interactions /></PivotItem>
      <PivotItem headerText={t('nav.kpis')}><Kpis /></PivotItem>
      <PivotItem headerText={t('nav.nps')}><Nps /></PivotItem>
      <PivotItem headerText={t('nav.serviceMonths')}><ServiceMonths /></PivotItem>
      <PivotItem headerText={t('nav.catalog')}><Catalog /></PivotItem>
    </Pivot>
  );
};

export default Operations;
