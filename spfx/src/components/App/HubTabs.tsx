import * as React from 'react';
import { Pivot, PivotItem, Stack, Text } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import Dashboard from '../Dashboard/Dashboard';
import Finance from '../Finance/Finance';
import Governance from '../Governance/Governance';
import Help from '../Help/Help';
import Ideas from '../Ideas/Ideas';
import Import from '../Import/Import';
import Initiatives from '../Initiatives/Initiatives';
import Actions from '../Actions/Actions';
import Notes from '../Notes/Notes';
import Operations from '../Operations/Operations';
import PeopleTab from '../People/PeopleTab';
import Projects from '../Projects/Projects';
import VendorsTab from '../Vendors/VendorsTab';
import { useT } from '../../i18n/I18n';

/** Tabs, translated. Separate from the root so it can read the language set by the provider. */
const HubTabs: React.FC<{ description: string }> = ({ description }) => {
  const t = useT();

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <Text variant="xxLarge" as="h1">{AppConfig.appName}</Text>
      <Text variant="large">{t('app.tagline')}</Text>
      {description && <Text>{description}</Text>}

      <Pivot overflowBehavior="menu" overflowAriaLabel={t('nav.more')} aria-label={AppConfig.appName}>
        <PivotItem headerText={t('nav.dashboard')}><Dashboard /></PivotItem>
        <PivotItem headerText={t('nav.ideas')}><Ideas /></PivotItem>
        <PivotItem headerText={t('nav.initiatives')}><Initiatives /></PivotItem>
        <PivotItem headerText={t('nav.projects')}><Projects /></PivotItem>
        <PivotItem headerText={t('nav.actions')}><Actions /></PivotItem>
        <PivotItem headerText={t('nav.finance')}><Finance /></PivotItem>
        <PivotItem headerText={t('nav.vendorsTab')}><VendorsTab /></PivotItem>
        <PivotItem headerText={t('nav.operations')}><Operations /></PivotItem>
        <PivotItem headerText={t('nav.people')}><PeopleTab /></PivotItem>
        <PivotItem headerText={t('nav.governance')}><Governance /></PivotItem>
        <PivotItem headerText={t('nav.notes')}><Notes /></PivotItem>
        <PivotItem headerText={t('nav.import')}><Import /></PivotItem>
        <PivotItem headerText={t('nav.help')}><Help /></PivotItem>
      </Pivot>
    </Stack>
  );
};

export default HubTabs;
