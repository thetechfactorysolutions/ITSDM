import * as React from 'react';
import { getTheme, IPivotStyles, Pivot, PivotItem, Stack, Text } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import Dashboard from '../Dashboard/Dashboard';
import Stock from '../Devices/Stock';
import Finance from '../Finance/Finance';
import Genius from '../Genius/Genius';
import WeeklyReviews from '../Management/WeeklyReviews';
import StrategyTab from '../Strategy/StrategyTab';
import Governance from '../Governance/Governance';
import Help from '../Help/Help';
import Ideas from '../Ideas/Ideas';
import Import from '../Import/Import';
import Initiatives from '../Initiatives/Initiatives';
import Actions from '../Actions/Actions';
import Agenda from '../Agenda/Agenda';
import Links from '../Links/Links';
import MattersTab from '../Matters/MattersTab';
import QuickAdd from '../Matters/QuickAdd';
import SetupBanner from './SetupBanner';
import Notes from '../Notes/Notes';
import Operations from '../Operations/Operations';
import PeopleTab from '../People/PeopleTab';
import Projects from '../Projects/Projects';
import PurchasesTab from '../Purchases/PurchasesTab';
import VendorsTab from '../Vendors/VendorsTab';
import { useT } from '../../i18n/I18n';
import { NavContext } from '../shared/Nav';

/** Tabs, translated. Separate from the root so it can read the language set by the provider. */
const HubTabs: React.FC<{ description: string }> = ({ description }) => {
  const t = useT();
  const theme = getTheme();
  const [tab, setTab] = React.useState<string>('dashboard');
  const nav = React.useMemo(() => ({ goTo: (key: string): void => { setTab(key); } }), []);
  const pivotStyles: Partial<IPivotStyles> = {
    root: { borderBottom: `1px solid ${theme.palette.neutralLighter}`, marginBottom: 4 },
    link: { borderRadius: 8, margin: '0 2px', selectors: { ':hover': { background: theme.palette.neutralLighter } } },
    linkIsSelected: { borderRadius: 8, selectors: { ':hover': { background: theme.palette.neutralLighter } } },
    itemContainer: { paddingTop: 16 }
  };

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <Stack horizontal wrap verticalAlign="center" tokens={{ childrenGap: 16 }}>
        <Text variant="xxLarge" as="h1">{AppConfig.appName}</Text>
        <QuickAdd />
      </Stack>
      <Text variant="large">{t('app.tagline')}</Text>
      {description && <Text>{description}</Text>}
      <SetupBanner />

      <NavContext.Provider value={nav}>
      <Pivot overflowBehavior="menu" overflowAriaLabel={t('nav.more')} aria-label={AppConfig.appName} selectedKey={tab} onLinkClick={item => { if (item && item.props.itemKey) { setTab(item.props.itemKey); } }} styles={pivotStyles}>
        <PivotItem headerText={t('nav.dashboard')} itemKey="dashboard"><Dashboard /></PivotItem>
        <PivotItem headerText={t('nav.matters')} itemKey="matters"><MattersTab /></PivotItem>
        <PivotItem headerText={t('nav.agenda')} itemKey="agenda"><Agenda /></PivotItem>
        <PivotItem headerText={t('nav.links')} itemKey="links"><Links /></PivotItem>
        <PivotItem headerText={t('nav.ideas')} itemKey="ideas"><Ideas /></PivotItem>
        <PivotItem headerText={t('nav.initiatives')} itemKey="initiatives"><Initiatives /></PivotItem>
        <PivotItem headerText={t('nav.projects')} itemKey="projects"><Projects /></PivotItem>
        <PivotItem headerText={t('nav.actions')} itemKey="actions"><Actions /></PivotItem>
        <PivotItem headerText={t('nav.purchases')} itemKey="purchases"><PurchasesTab /></PivotItem>
        <PivotItem headerText={t('nav.finance')} itemKey="finance"><Finance /></PivotItem>
        <PivotItem headerText={t('nav.vendorsTab')} itemKey="vendors"><VendorsTab /></PivotItem>
        <PivotItem headerText={t('nav.operations')} itemKey="operations"><Operations /></PivotItem>
        <PivotItem headerText={t('nav.people')} itemKey="people"><PeopleTab /></PivotItem>
        <PivotItem headerText={t('nav.devices')} itemKey="devices"><Stock /></PivotItem>
        <PivotItem headerText={t('nav.genius')} itemKey="genius"><Genius /></PivotItem>
        <PivotItem headerText={t('nav.strategy')} itemKey="strategy"><StrategyTab /></PivotItem>
        <PivotItem headerText={t('nav.weeklyReview')} itemKey="weekly"><WeeklyReviews /></PivotItem>
        <PivotItem headerText={t('nav.governance')} itemKey="governance"><Governance /></PivotItem>
        <PivotItem headerText={t('nav.notes')} itemKey="notes"><Notes /></PivotItem>
        <PivotItem headerText={t('nav.import')} itemKey="import"><Import /></PivotItem>
        <PivotItem headerText={t('nav.help')} itemKey="help"><Help /></PivotItem>
      </Pivot>
      </NavContext.Provider>
    </Stack>
  );
};

export default HubTabs;
