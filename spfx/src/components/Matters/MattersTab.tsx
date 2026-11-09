import * as React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { isInbox } from '../../rules/matters';
import { useHubData } from '../shared/HubData';
import Areas from './Areas';
import MatterScreen from './Matters';

/** The inbox, the open matters, the history and the areas, one tab with four views. */
const MattersTab: React.FC = () => {
  const t = useT();
  const { matters } = useHubData();
  const waiting = matters.items.filter(isInbox).length;

  return (
    <Pivot aria-label={t('nav.matters')} overflowBehavior="menu" overflowAriaLabel={t('nav.more')}>
      <PivotItem headerText={waiting > 0 ? `${t('nav.inbox')} (${waiting})` : t('nav.inbox')}><MatterScreen view="inbox" /></PivotItem>
      <PivotItem headerText={t('nav.openMatters')}><MatterScreen view="open" /></PivotItem>
      <PivotItem headerText={t('nav.history')}><MatterScreen view="history" /></PivotItem>
      <PivotItem headerText={t('nav.areas')}><Areas /></PivotItem>
    </Pivot>
  );
};

export default MattersTab;
