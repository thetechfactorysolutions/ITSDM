import * as React from 'react';
import { DefaultButton, getTheme, Modal, SearchBox } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { useT } from '../../i18n/I18n';
import { IPaletteEntry, searchEntries } from '../../rules/palette';
import { SOURCES, TABS } from '../../config/navMap';
import { useHubData } from '../shared/HubData';
import { useNav } from '../shared/Nav';

/**
 * Ctrl+K (or the button in the header): type to jump to a tab or to a record by its title. Choosing a
 * record opens its tab with the search already filled in.
 */
const CommandPalette: React.FC = () => {
  const t = useT();
  const theme = getTheme();
  const hub = useHubData();
  const nav = useNav();
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [query, setQuery] = React.useState<string>('');
  const [active, setActive] = React.useState<number>(0);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuery('');
        setActive(0);
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const entries = React.useMemo((): IPaletteEntry[] => {
    if (!isOpen) {
      return [];
    }
    const list: IPaletteEntry[] = TABS.map(([key, textKey]) => ({ key: `tab:${key}`, label: t(textKey), kind: t('palette.tab'), tab: key }));
    SOURCES.forEach(source => {
      const state = hub[source.hub] as unknown as { items: Array<{ id?: number; title?: string }> } | undefined;
      (state ? state.items : []).forEach(item => {
        if (item.title) {
          list.push({ key: `${source.hub}:${item.id}`, label: item.title, kind: t(source.kind), tab: source.tab, listName: AppConfig.sharePoint.listNames[source.listName], search: item.title });
        }
      });
    });
    return list;
  }, [isOpen, hub, t]);

  const results = React.useMemo(() => searchEntries(entries, query), [entries, query]);

  const choose = (entry: IPaletteEntry | undefined): void => {
    if (!entry) {
      return;
    }
    setIsOpen(false);
    nav.goTo(entry.tab, entry.listName && entry.search ? { listName: entry.listName, search: entry.search } : undefined);
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(prev => Math.min(prev + 1, Math.max(0, results.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(prev => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <>
      <DefaultButton
        text={t('palette.button')}
        iconProps={{ iconName: 'Search' }}
        title={t('palette.hint')}
        ariaLabel={t('palette.open')}
        onClick={() => { setQuery(''); setActive(0); setIsOpen(true); }}
      />
      <Modal isOpen={isOpen} onDismiss={() => setIsOpen(false)} isBlocking={false} titleAriaId="palette-title" styles={{ main: { minWidth: 'min(560px, 94vw)', maxHeight: '70vh', borderRadius: 12 } }}>
        <div style={{ padding: 16, display: 'grid', gap: 10 }} onKeyDown={onKeyDown}>
          <h2 id="palette-title" style={{ margin: 0, fontSize: 16 }}>{t('palette.title')}</h2>
          <SearchBox
            autoFocus
            placeholder={t('palette.placeholder')}
            ariaLabel={t('palette.placeholder')}
            value={query}
            onChange={(_, value) => { setQuery(value ?? ''); setActive(0); }}
          />
          <ul role="listbox" aria-label={t('palette.title')} style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', maxHeight: '45vh' }}>
            {results.map((entry, index) => (
              <li
                key={entry.key}
                role="option"
                aria-selected={index === active}
                onClick={() => choose(entry)}
                onMouseEnter={() => setActive(index)}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: index === active ? theme.palette.themeLighter : undefined }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label}</span>
                <span style={{ color: theme.palette.neutralSecondary, fontSize: 12 }}>{entry.kind}</span>
              </li>
            ))}
            {results.length === 0 && <li style={{ padding: 10, color: theme.palette.neutralSecondary }}>{t('palette.none')}</li>}
          </ul>
        </div>
      </Modal>
    </>
  );
};

export default CommandPalette;
