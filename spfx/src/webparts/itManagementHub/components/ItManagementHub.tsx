import * as React from 'react';
import type { IItManagementHubProps } from './IItManagementHubProps';
import styles from './ItManagementHub.module.scss';
import HubTabs from '../../../components/App/HubTabs';
import { HubDataProvider } from '../../../components/shared/HubData';
import { useSharePointService } from '../../../hooks/useSharePointService';
import { I18nProvider, resolveLanguage } from '../../../i18n/I18n';

const ItManagementHub: React.FC<IItManagementHubProps> = ({ description, context, language }) => {
  const store = useSharePointService(context);
  const resolved = resolveLanguage(language, context.pageContext.cultureInfo.currentUICultureName);

  return (
    <section className={styles.itManagementHub} lang={resolved}>
      <I18nProvider language={resolved}>
        <HubDataProvider store={store} userEmail={context.pageContext.user.email}>
          <HubTabs description={description} />
        </HubDataProvider>
      </I18nProvider>
    </section>
  );
};

export default ItManagementHub;
