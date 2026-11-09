import * as React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import BusinessCases from './BusinessCases';
import Objectives from './Objectives';

/** Objectives and business cases, one tab with two views. */
const StrategyTab: React.FC = () => {
  const t = useT();
  return (
    <Pivot aria-label={t('nav.strategy')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
      <PivotItem headerText={t('nav.objectives')}><Objectives /></PivotItem>
      <PivotItem headerText={t('nav.businessCases')}><BusinessCases /></PivotItem>
    </Pivot>
  );
};

export default StrategyTab;
