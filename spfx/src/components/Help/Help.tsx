import * as React from 'react';
import { Link, Stack, Text } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';

const Section: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <Stack tokens={{ childrenGap: 4 }}>
    <Text variant="large" as="h3">{title}</Text>
    {children}
  </Stack>
);

const Help: React.FC = () => {
  const lists = AppConfig.sharePoint.listNames;

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      <Text variant="xLarge" as="h2">How the IT Management Hub works</Text>

      <Section title="The idea">
        <Text>
          The hub follows one flow: an <b>Idea</b> is validated and converted into an <b>Initiative</b>, which is delivered through
          <b> Projects</b>, and every follow-up is tracked as an <b>Action</b>. The Dashboard summarises what needs attention.
        </Text>
      </Section>

      <Section title="Dashboard">
        <Text>Counters for active ideas, initiatives and projects, open and overdue actions, and projects at risk.</Text>
        <Text>
          <b>Overdue</b>: the due date is before today (an action due today is not overdue yet).
          <b> At risk</b>: the forecast exceeds the budget by more than 10%, or the project status is AT_RISK.
        </Text>
        <Text><b>My Actions</b> counts open actions where you are the owner: overdue, due today and due in the next 7 days.</Text>
      </Section>

      <Section title="Ideas">
        <Text>Click <b>New Idea</b> to capture one. Double-click a row (or select it and press Edit) to change it.</Text>
        <Text>
          Status moves forward one step at a time: NEW → DISCOVERY → VALIDATED → PLANNED → IN_PROGRESS → PILOT → ROLLOUT → COMPLETED.
          An idea can also be REJECTED (before it is planned) or CANCELLED. The Status list only offers the steps that are allowed.
        </Text>
        <Text>
          Select a <b>VALIDATED</b> idea and click <b>Convert to Initiative</b>: a DRAFT initiative is created from it and the idea moves to PLANNED.
          If the conversion fails halfway, the initiative is removed again so nothing is left half done.
        </Text>
      </Section>

      <Section title="Initiatives, Projects and Actions">
        <Text>Use <b>New …</b> to create and double-click a row to edit. Initiatives track progress (0–100%), projects track budget against forecast and risk level, and actions have an owner, priority and due date.</Text>
        <Text>The Actions tab is split into Overdue, Today, This week and All.</Text>
      </Section>

      <Section title="Forms">
        <Text>Title and Owner are required. Pick the owner by typing a name or email. Dates can be typed as YYYY-MM-DD or picked from the calendar.</Text>
        <Text>If something is wrong, the field shows a message after you press Save. If SharePoint rejects the save, the error appears at the top of the panel and nothing is lost.</Text>
        <Text>IDs (such as IDEA-20261108-K3F9QZ) are generated automatically and cannot be edited afterwards.</Text>
      </Section>

      <Section title="Where the data lives">
        <Text>Everything is stored in SharePoint lists on this site, so you can also filter, export or set permissions on them directly:</Text>
        <Text>{lists.ideas} · {lists.initiatives} · {lists.projects} · {lists.actions}</Text>
        <Text>
          The lists and some sample items are created automatically when the app is added to the site. If a tab says a list does not exist,
          remove the app from the site (Site contents → the app → Remove) and add it again. Sample items have IDs such as IDEA-DEMO-001 and an example owner;
          delete them from the lists whenever you like.{' '}
          <Link href="https://github.com/thetechfactorysolutions/ITSDM" target="_blank" rel="noopener noreferrer">Project on GitHub</Link>
        </Text>
      </Section>
    </Stack>
  );
};

export default Help;
