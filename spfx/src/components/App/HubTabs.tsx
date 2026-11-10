import * as React from 'react';
import { getTheme, IPivotItemProps, IPivotStyles, Pivot, PivotItem, Stack, Text } from '@fluentui/react';
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
import { identityForTab } from '../../config/identity';
import { INavSeed, NavContext } from '../shared/Nav';
import CommandPalette from './CommandPalette';

/** Tabs, translated. Separate from the root so it can read the language set by the provider. */
/** The name of a tab with the emoji of its module in front. */
const withEmoji = (tab: string): ((props?: IPivotItemProps) => React.ReactElement) => (props?: IPivotItemProps): React.ReactElement => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden="true">{identityForTab(tab).emoji}</span><span>{props ? props.headerText : ''}</span></span>
);

const HubTabs: React.FC<{ description: string }> = ({ description }) => {
  const t = useT();
  const theme = getTheme();
  const [tab, setTab] = React.useState<string>('dashboard');
  const [seed, setSeed] = React.useState<INavSeed | undefined>();
  const nav = React.useMemo(() => ({ goTo: (key: string, from?: INavSeed): void => { setTab(key); setSeed(from); }, seed, clearSeed: (): void => setSeed(undefined) }), [seed]);
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
        <NavContext.Provider value={nav}><CommandPalette /></NavContext.Provider>
      </Stack>
      <Text variant="large">{t('app.tagline')}</Text>
      {description && <Text>{description}</Text>}
      <SetupBanner />

      <NavContext.Provider value={nav}>
      <Pivot overflowBehavior="menu" overflowAriaLabel={t('nav.more')} aria-label={AppConfig.appName} selectedKey={tab} onLinkClick={item => { if (item && item.props.itemKey) { setTab(item.props.itemKey); } }} styles={pivotStyles}>
        <PivotItem headerText={t('nav.dashboard')} itemKey="dashboard" onRenderItemLink={withEmoji('dashboard')}><Dashboard /></PivotItem>
        <PivotItem headerText={t('nav.matters')} itemKey="matters" onRenderItemLink={withEmoji('matters')}><MattersTab /></PivotItem>
        <PivotItem headerText={t('nav.agenda')} itemKey="agenda" onRenderItemLink={withEmoji('agenda')}><Agenda /></PivotItem>
        <PivotItem headerText={t('nav.links')} itemKey="links" onRenderItemLink={withEmoji('links')}><Links /></PivotItem>
        <PivotItem headerText={t('nav.ideas')} itemKey="ideas" onRenderItemLink={withEmoji('ideas')}><Ideas /></PivotItem>
        <PivotItem headerText={t('nav.initiatives')} itemKey="initiatives" onRenderItemLink={withEmoji('initiatives')}><Initiatives /></PivotItem>
        <PivotItem headerText={t('nav.projects')} itemKey="projects" onRenderItemLink={withEmoji('projects')}><Projects /></PivotItem>
        <PivotItem headerText={t('nav.actions')} itemKey="actions" onRenderItemLink={withEmoji('actions')}><Actions /></PivotItem>
        <PivotItem headerText={t('nav.purchases')} itemKey="purchases" onRenderItemLink={withEmoji('purchases')}><PurchasesTab /></PivotItem>
        <PivotItem headerText={t('nav.finance')} itemKey="finance" onRenderItemLink={withEmoji('finance')}><Finance /></PivotItem>
        <PivotItem headerText={t('nav.vendorsTab')} itemKey="vendors" onRenderItemLink={withEmoji('vendors')}><VendorsTab /></PivotItem>
        <PivotItem headerText={t('nav.operations')} itemKey="operations" onRenderItemLink={withEmoji('operations')}><Operations /></PivotItem>
        <PivotItem headerText={t('nav.people')} itemKey="people" onRenderItemLink={withEmoji('people')}><PeopleTab /></PivotItem>
        <PivotItem headerText={t('nav.devices')} itemKey="devices" onRenderItemLink={withEmoji('devices')}><Stock /></PivotItem>
        <PivotItem headerText={t('nav.genius')} itemKey="genius" onRenderItemLink={withEmoji('genius')}><Genius /></PivotItem>
        <PivotItem headerText={t('nav.strategy')} itemKey="strategy" onRenderItemLink={withEmoji('strategy')}><StrategyTab /></PivotItem>
        <PivotItem headerText={t('nav.weeklyReview')} itemKey="weekly" onRenderItemLink={withEmoji('weekly')}><WeeklyReviews /></PivotItem>
        <PivotItem headerText={t('nav.governance')} itemKey="governance" onRenderItemLink={withEmoji('governance')}><Governance /></PivotItem>
        <PivotItem headerText={t('nav.notes')} itemKey="notes" onRenderItemLink={withEmoji('notes')}><Notes /></PivotItem>
        <PivotItem headerText={t('nav.import')} itemKey="import" onRenderItemLink={withEmoji('import')}><Import /></PivotItem>
        <PivotItem headerText={t('nav.help')} itemKey="help" onRenderItemLink={withEmoji('help')}><Help /></PivotItem>
      </Pivot>
      </NavContext.Provider>
    </Stack>
  );
};

export default HubTabs;
