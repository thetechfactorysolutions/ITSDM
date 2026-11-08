import * as React from 'react';
import { Pivot, PivotItem, Stack, Text } from '@fluentui/react';
import type { IItManagementHubProps } from './IItManagementHubProps';
import styles from './ItManagementHub.module.scss';
import { AppConfig } from '../../../config/AppConfig';
import { HubDataProvider } from '../../../components/shared/HubData';
import Dashboard from '../../../components/Dashboard/Dashboard';
import Ideas from '../../../components/Ideas/Ideas';
import Initiatives from '../../../components/Initiatives/Initiatives';
import Actions from '../../../components/Actions/Actions';
import Projects from '../../../components/Projects/Projects';

const ItManagementHub: React.FC<IItManagementHubProps> = ({ description, context }) => {
  return (
    <section className={styles.itManagementHub}>
      <Stack tokens={{ childrenGap: 12 }}>
        <Text variant="xxLarge">{AppConfig.appName}</Text>
        <Text variant="large">{AppConfig.tagline}</Text>
        {description && <Text>{description}</Text>}

        <HubDataProvider context={context}>
          <Pivot>
            <PivotItem headerText="Dashboard">
              <Dashboard />
            </PivotItem>
            <PivotItem headerText="Ideas">
              <Ideas />
            </PivotItem>
            <PivotItem headerText="Initiatives">
              <Initiatives />
            </PivotItem>
            <PivotItem headerText="Actions">
              <Actions />
            </PivotItem>
            <PivotItem headerText="Projects">
              <Projects />
            </PivotItem>
          </Pivot>
        </HubDataProvider>
      </Stack>
    </section>
  );
};

export default ItManagementHub;
