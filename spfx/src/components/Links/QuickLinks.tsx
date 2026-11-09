import * as React from 'react';
import { Link, Stack, Text } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { LinkItem } from '../../models';
import { groupLinksByCategory, isSafeUrl } from '../../rules/matters';

export interface IQuickLinksProps {
  links: LinkItem[];
  /** Show the category as a heading above its links (the Links tab) or just the links in a row (the dashboard). */
  grouped?: boolean;
}

/** The address as a link that opens in a new tab. An address that is not plain http(s) is shown as text, never as a link. */
export const SafeLink: React.FC<{ link: LinkItem }> = ({ link }) => {
  const t = useT();
  return isSafeUrl(link.url)
    ? <Link href={link.url.trim()} target="_blank" rel="noopener noreferrer" title={link.description || link.url} aria-label={`${link.title} (${t('links.open')})`}>{link.title}</Link>
    : <Text>{link.title}</Text>;
};

/** Links to open with one click, grouped by category or in a single row. */
const QuickLinks: React.FC<IQuickLinksProps> = ({ links, grouped }) => {
  const t = useT();
  const groups = groupLinksByCategory(links, t('links.noCategory'));

  if (!grouped) {
    return (
      <Stack horizontal wrap tokens={{ childrenGap: 16 }}>
        {groups.map(group => group.links.map(link => <SafeLink key={link.linkId} link={link} />))}
      </Stack>
    );
  }

  return (
    <Stack tokens={{ childrenGap: 10 }}>
      {groups.map(group => (
        <Stack key={group.category} tokens={{ childrenGap: 2 }}>
          <Text variant="mediumPlus" as="h3">{group.category}</Text>
          <Stack horizontal wrap tokens={{ childrenGap: 16 }}>
            {group.links.map(link => (
              <span key={link.linkId}>
                <SafeLink link={link} />{link.pinned ? <span aria-label={t('links.pinnedMark')} title={t('links.pinnedMark')}> ★</span> : null}
              </span>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
};

export default QuickLinks;
