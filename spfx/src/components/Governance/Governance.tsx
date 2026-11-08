import * as React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import Decisions from './Decisions';
import Lessons from './Lessons';
import Reviews from './Reviews';
import Risks from './Risks';

/** Risks, decisions, lessons learned and reviews, one tab with four views. */
const Governance: React.FC = () => {
  const t = useT();
  return (
    <Pivot aria-label={t('nav.governance')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
      <PivotItem headerText={t('nav.risks')}><Risks /></PivotItem>
      <PivotItem headerText={t('nav.decisions')}><Decisions /></PivotItem>
      <PivotItem headerText={t('nav.lessons')}><Lessons /></PivotItem>
      <PivotItem headerText={t('nav.reviews')}><Reviews /></PivotItem>
    </Pivot>
  );
};

export default Governance;
