import * as React from 'react';
import { Pivot, PivotItem, Stack, Text } from '@fluentui/react';
import type { IItManagementHubProps } from './IItManagementHubProps';
import styles from './ItManagementHub.module.scss';
import { AppConfig } from '../../../config/AppConfig';
import { HubDataProvider } from '../../../components/shared/HubData';
import Dashboard from '../../../components/Dashboard/Dashboard';
import Finance from '../../../components/Finance/Finance';
import Governance from '../../../components/Governance/Governance';
import Help from '../../../components/Help/Help';
import Ideas from '../../../components/Ideas/Ideas';
import Import from '../../../components/Import/Import';
import Initiatives from '../../../components/Initiatives/Initiatives';
import Actions from '../../../components/Actions/Actions';
import Notes from '../../../components/Notes/Notes';
import Operations from '../../../components/Operations/Operations';
import PeopleTab from '../../../components/People/PeopleTab';
import Projects from '../../../components/Projects/Projects';
import VendorsTab from '../../../components/Vendors/VendorsTab';
import { I18nProvider, resolveLanguage, useT } from '../../../i18n/I18n';

/** Tabs, translated. Separate from the root so it can read the language set by the provider. */
const Tabs: React.FC<{ description: string }> = ({ description }) => {
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

const ItManagementHub: React.FC<IItManagementHubProps> = ({ description, context, language }) => {
  const resolved = resolveLanguage(language, context.pageContext.cultureInfo.currentUICultureName);

  return (
    <section className={styles.itManagementHub} lang={resolved}>
      <I18nProvider language={resolved}>
        <HubDataProvider context={context}>
          <Tabs description={description} />
        </HubDataProvider>
      </I18nProvider>
    </section>
  );
};

export default ItManagementHub;
