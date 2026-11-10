import { SOURCES } from '../../config/navMap';
import { TranslateFn } from '../../i18n/I18n';
import { readField } from '../../rules/insights';
import { ISourceItems } from '../../rules/views3';
import { IHubData } from './HubData';

/** Every list that has records worth looking across (the same ones the quick search covers), in the shape the cross-list rules read. */
export const sourcesFromHub = (hub: IHubData, t: TranslateFn): ISourceItems[] =>
  SOURCES.map(source => {
    const state = hub[source.hub] as unknown as { items: unknown[] } | undefined;
    return {
      key: String(source.hub),
      title: t(source.kind),
      tab: source.tab,
      items: state ? state.items : [],
      getStatus: (item: unknown) => readField(item, 'status'),
      getTitle: (item: unknown) => readField(item, 'title')
    };
  });
