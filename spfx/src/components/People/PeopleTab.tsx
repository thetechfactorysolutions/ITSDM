import * as React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import Knowledge from './Knowledge';
import Skills from './Skills';
import Trainings from './Training';

/** Skills, training plans and the knowledge base, one tab with three views. */
const PeopleTab: React.FC = () => {
  const t = useT();
  return (
    <Pivot aria-label={t('nav.people')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
      <PivotItem headerText={t('nav.skills')}><Skills /></PivotItem>
      <PivotItem headerText={t('nav.training')}><Trainings /></PivotItem>
      <PivotItem headerText={t('nav.knowledge')}><Knowledge /></PivotItem>
    </Pivot>
  );
};

export default PeopleTab;
