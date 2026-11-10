import * as React from 'react';
import {
  CommandBar, DefaultButton, DetailsList, DetailsListLayoutMode, Dropdown, IColumn, ICommandBarItemProps, IDropdownOption, MessageBar,
  ISearchBox, MessageBarType, Panel, PanelType, PrimaryButton, SearchBox, Selection, SelectionMode, Stack, Text, Toggle
} from '@fluentui/react';
import { buildApprovalPayload } from '../../entities/payloads';
import { useLanguage, useT } from '../../i18n/I18n';
import { IListHookState } from '../../hooks/useListItems';
import { ApprovalStatus, IApprovalState } from '../../models';
import { IDataStore } from '../../data/IDataStore';
import { ApprovalEntity, decideApproval, EMPTY_APPROVAL, evaluateAnyChange, getApproval, IGateResult, requestApproval } from '../../rules/approvals';
import { ICsvColumn, toCsv } from '../../rules/csv';
import { applyView, DEFAULT_VIEW, ITableView } from '../../rules/tableView';
import { hasErrors, ValidationErrors } from '../../rules/validation';
import { downloadTextFile } from '../../utils/download';
import ApprovalSection from './ApprovalSection';
import AttachmentsSection from './AttachmentsSection';
import ConfirmDialog from './ConfirmDialog';
import CsvImportPanel from './CsvImportPanel';
import { FormGrid } from './FormGrid';
import { useHubData } from './HubData';
import { useNav } from './Nav';
import Insights, { IChip, IInsightsConfig } from './Insights';
import { useFavorites } from './useFavorites';
import { readMemory, writeMemory } from './viewMemory';

export interface IEntityBase {
  id?: number;
  modified?: string;
  editor?: string;
  approval?: IApprovalState;
}

/** Connects a screen to the approval rules (src/rules/approvals.ts). Leave it out for items that have none. */
export interface IApprovalConfig<T> {
  entity: ApprovalEntity;
  getBusinessId: (item: T) => string;
  /** The item as it would be after changing only its status. */
  proposeStatus: (item: T, status: string) => T;
}

type Accessor<T> = (item: T) => string | number | undefined;

export interface IFormContext<T> {
  form: T;
  setForm: (update: (previous: T) => T) => void;
  errors: ValidationErrors;
  original: T | undefined;
  isEdit: boolean;
  service: IDataStore;
}

export interface IEntityScreenProps<T extends IEntityBase> {
  /** Translation key prefix for the screen texts, e.g. "ideas" -> ideas.title, ideas.new, ideas.empty. */
  textKey: string;
  state: IListHookState<T>;
  service: IDataStore;
  statuses: string[];
  getStatus: (item: T) => string;
  getTitle: (item: T) => string;
  columns: IColumn[];
  sortAccessors: Record<string, Accessor<T>>;
  searchFields: Array<Accessor<T>>;
  newItem: () => T;
  validate: (item: T) => ValidationErrors;
  buildPayload: (item: T) => Record<string, unknown>;
  /** Applies side effects of a change before saving (e.g. completion date). */
  prepareForSave?: (form: T, original: T | undefined) => T;
  /** Returns an error message to block the save, or undefined. */
  checkBeforeSave?: (form: T, original: T | undefined) => string | undefined;
  renderForm: (context: IFormContext<T>) => React.ReactNode;
  renderDetail?: (item: T) => React.ReactNode;
  /** Statuses the item may be changed to from the table, including its current one. Enables the inline status picker. */
  quickStatuses?: (item: T) => string[];
  /** Fields to write when the status is changed from the table. */
  quickPayload?: (item: T, status: string) => Record<string, unknown>;
  /** Status used by "Archive"; the command is disabled when the item cannot move there. */
  archiveStatus: string;
  canArchive: (item: T) => boolean;
  /** Hides the Archive command for lists where it makes no sense (the status picker covers it). */
  hideArchive?: boolean;
  csvFileName: string;
  csvColumns: Array<ICsvColumn<T>>;
  csvFromRow: (row: Record<string, string>) => T;
  extraCommands?: (selected: T | undefined) => ICommandBarItemProps[];
  extraContent?: React.ReactNode;
  approval?: IApprovalConfig<T>;
  listName: string;
  /** Shows only the items it accepts (the inbox, the open matters, the history are views of one list). */
  scope?: (item: T) => boolean;
  /** Filters the table starts with, e.g. `{ showClosed: true }` for a history. */
  initialView?: Partial<ITableView>;
  /** Hides the attachments in the edit panel for lists where they make no sense. */
  hideAttachments?: boolean;
  /** Extra figures and charts for the summary above the table; the usual ones (totals, late, mine, favourites, what is most used) come with every screen. */
  insights?: IInsightsConfig<T>;
  /** Whether the person may edit this item. When not, double-clicking opens the details instead and Edit is disabled. */
  canEdit?: (item: T) => boolean;
  /** Whether the person may delete this item. */
  canDelete?: (item: T) => boolean;
  /** Hides Import CSV, for people who cannot create what it would add. */
  hideImport?: boolean;
  /** Hides the "New" command, for views of a list that cannot create what they show (a history). */
  hideNew?: boolean;
  /** Hides the "Show closed" switch, for views whose scope already decides what is closed. */
  hideClosedToggle?: boolean;
}

function EntityScreen<T extends IEntityBase>(props: IEntityScreenProps<T>): React.ReactElement {
  const t = useT();
  const language = useLanguage();
  const { userEmail } = useHubData();
  const { textKey, state, service, statuses, getStatus, columns, sortAccessors, searchFields } = props;

  const viewKey = `view.${props.listName}`;
  const [view, setView] = React.useState<ITableView>(() => {
    const remembered = props.initialView ? undefined : readMemory<Partial<ITableView>>(viewKey);
    return { ...DEFAULT_VIEW, ...(remembered ?? {}), search: '', ...props.initialView };
  });
  React.useEffect(() => {
    writeMemory(viewKey, { status: view.status, showClosed: view.showClosed, sortKey: view.sortKey, sortDescending: view.sortDescending });
  }, [viewKey, view.status, view.showClosed, view.sortKey, view.sortDescending]);
  const [chip, setChip] = React.useState<IChip<T> | undefined>();
  const [insightsOpen, setInsightsOpen] = React.useState<boolean>(() => readMemory<boolean>(`insights.${props.listName}`) !== false);
  const searchRef = React.useRef<ISearchBox>(null);
  const favorites = useFavorites(props.listName);
  // arriving from the quick search: show the record that was looked for
  const nav = useNav();
  React.useEffect(() => {
    const seed = nav.seed;
    if (seed && seed.listName === props.listName) {
      setChip(undefined);
      setView(prev => ({ ...prev, search: seed.search, status: '', showClosed: true }));
      nav.clearSeed();
    }
  }, [nav.seed, props.listName]);
  const [selectedId, setSelectedId] = React.useState<number | undefined>();
  const [isFormOpen, setIsFormOpen] = React.useState<boolean>(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState<boolean>(false);
  const [isCsvOpen, setIsCsvOpen] = React.useState<boolean>(false);
  const [confirm, setConfirm] = React.useState<'delete' | 'archive' | undefined>();
  const [submitted, setSubmitted] = React.useState<boolean>(false);
  const [localError, setLocalError] = React.useState<string | undefined>();
  const [form, setFormState] = React.useState<T>(props.newItem);
  const [gate, setGate] = React.useState<IGateResult | undefined>();

  const selectionRef = React.useRef<Selection>();
  if (!selectionRef.current) {
    selectionRef.current = new Selection({
      getKey: item => String((item as T).id),
      onSelectionChanged: () => {
        const chosen = (selectionRef.current as Selection).getSelection() as T[];
        setSelectedId(chosen.length > 0 ? chosen[0].id : undefined);
      }
    });
  }

  const selected: T | undefined = React.useMemo(
    () => state.items.filter(item => item.id === selectedId)[0],
    [state.items, selectedId]
  );

  const scoped = React.useMemo(
    () => (props.scope ? state.items.filter(props.scope) : state.items),
    [state.items, props.scope]
  );

  const chipped = React.useMemo(() => (chip ? scoped.filter(chip.test) : scoped), [scoped, chip]);

  const visible = React.useMemo(
    () => applyView(chipped, view, getStatus, searchFields, sortAccessors),
    [chipped, view, getStatus, searchFields, sortAccessors]
  );

  // "/" jumps to the search box, like in most tools
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && searchRef.current) {
        event.preventDefault();
        searchRef.current.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const errors: ValidationErrors = submitted ? props.validate(form) : {};
  const shownError = localError || state.error;
  const setForm = (update: (previous: T) => T): void => setFormState(update);

  const statusFilterOptions: IDropdownOption[] = [{ key: '', text: t('common.allStatuses') }]
    .concat(statuses.map(status => ({ key: status, text: t(`status.${status}`) })));

  // ----- actions -----
  const openCreate = (): void => {
    setSelectedId(undefined);
    selectionRef.current?.setAllSelected(false);
    setSubmitted(false);
    setLocalError(undefined);
    setGate(undefined);
    setFormState(props.newItem());
    setIsFormOpen(true);
  };

  const openEdit = (item: T | undefined): void => {
    if (!item) {
      return;
    }
    setSelectedId(item.id);
    setSubmitted(false);
    setLocalError(undefined);
    setGate(undefined);
    setFormState(item);
    setIsFormOpen(true);
  };

  const save = async (): Promise<void> => {
    setLocalError(undefined);
    setSubmitted(true);

    if (hasErrors(props.validate(form))) {
      return;
    }

    const problem = props.checkBeforeSave ? props.checkBeforeSave(form, selected) : undefined;
    if (problem) {
      setLocalError(problem);
      return;
    }

    let toSave = props.prepareForSave ? props.prepareForSave(form, selected) : form;

    if (props.approval) {
      // The approval stored on the item is the truth: the copy in the form can be out of date.
      toSave = { ...toSave, approval: getApproval(selected) };
      const result = evaluateAnyChange(props.approval.entity, selected, toSave);
      if (result.blockedBy.length > 0) {
        setGate(result);
        return;
      }
      setGate(undefined);
      // An approval is used up by the change it was given for.
      if (result.consumesApproval) {
        toSave = { ...toSave, approval: EMPTY_APPROVAL };
      }
    }

    // On failure the hook rethrows, so the panel stays open and shows the error.
    if (selected && selected.id) {
      await state.update(selected.id, props.buildPayload(toSave));
    } else {
      await state.create(props.buildPayload(toSave));
    }
    setIsFormOpen(false);
  };

  /** Rule that blocks moving an item to a status from the table or the Archive command, if any. */
  const blockingRuleFor = (item: T, status: string): { titleKey: string; consumes: boolean } | undefined => {
    if (!props.approval) {
      return undefined;
    }
    const result = evaluateAnyChange(props.approval.entity, item, props.approval.proposeStatus(item, status));
    if (result.blockedBy.length > 0) {
      return { titleKey: result.blockedBy[0].titleKey, consumes: false };
    }
    return result.consumesApproval ? { titleKey: '', consumes: true } : undefined;
  };

  const runConfirmed = async (): Promise<void> => {
    const action = confirm;
    setConfirm(undefined);
    if (!selected || !selected.id || !action) {
      return;
    }

    setLocalError(undefined);
    try {
      if (action === 'delete') {
        await state.remove(selected.id);
        setSelectedId(undefined);
      } else {
        const blocked = blockingRuleFor(selected, props.archiveStatus);
        if (blocked && !blocked.consumes) {
          setLocalError(t('approval.quickBlocked', { rule: t(blocked.titleKey) }));
          return;
        }
        await state.update(selected.id, { Status: props.archiveStatus, ...(blocked ? buildApprovalPayload(EMPTY_APPROVAL) : {}) });
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const changeStatus = (item: T, status: string): void => {
    if (!item.id) {
      return;
    }
    setLocalError(undefined);
    const blocked = blockingRuleFor(item, status);
    if (blocked && !blocked.consumes) {
      setLocalError(t('approval.quickBlocked', { rule: t(blocked.titleKey) }));
      return;
    }
    const base = props.quickPayload ? props.quickPayload(item, status) : { Status: status };
    // The approval given for this change is used up by it.
    const payload = blocked ? { ...base, ...buildApprovalPayload(EMPTY_APPROVAL) } : base;
    state.update(item.id, payload).catch(err => setLocalError(err instanceof Error ? err.message : t('common.unknownError')));
  };

  const exportCsv = (): void => {
    downloadTextFile(props.csvFileName, toCsv(visible, props.csvColumns));
  };

  // ----- approvals: request and decision are saved on their own, apart from the rest of the form -----
  const requestApprovalFor = async (ruleId: string, approver: string): Promise<void> => {
    if (!selected || !selected.id) {
      return;
    }
    await state.update(selected.id, buildApprovalPayload(requestApproval(ruleId, approver)));
  };

  const decideApprovalFor = async (status: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED, comment: string): Promise<void> => {
    if (!selected || !selected.id) {
      return;
    }
    await state.update(selected.id, buildApprovalPayload(decideApproval(getApproval(selected), status, userEmail, comment)));
    setGate(undefined);
  };

  // CSV rows follow the same rules: a row in a status that needs approval is not imported.
  const csvValidate = React.useCallback((item: T): ValidationErrors => {
    const found = props.validate(item);
    if (props.approval && evaluateAnyChange(props.approval.entity, undefined, item).blockedBy.length > 0) {
      return { ...found, status: 'validation.needsApproval' };
    }
    return found;
  }, [props.validate, props.approval]);

  // ----- columns: sorting, translated status, inline status picker -----
  const withApprovalColumn: IColumn[] = props.approval
    ? columns.concat([{
      key: 'approval', name: t('approval.column'), minWidth: 110,
      onRender: (item: T) => {
        const status = getApproval(item).status;
        return status === ApprovalStatus.NONE ? null : <span>{t(`approval.status.${status}`)}</span>;
      }
    }])
    : columns;

  const tableColumns: IColumn[] = withApprovalColumn.map(column => {
    const sortable = !!sortAccessors[column.key];
    const base: IColumn = {
      ...column,
      isResizable: true,
      isSorted: view.sortKey === column.key,
      isSortedDescending: view.sortKey === column.key && view.sortDescending,
      onColumnClick: sortable
        ? () => setView(prev => ({ ...prev, sortKey: column.key, sortDescending: prev.sortKey === column.key ? !prev.sortDescending : false }))
        : undefined
    };

    if (column.key !== 'status') {
      return base;
    }

    return {
      ...base,
      minWidth: props.quickStatuses ? 150 : column.minWidth,
      onRender: (item: T) => {
        const allowed = props.quickStatuses ? props.quickStatuses(item) : [];
        if (allowed.length <= 1) {
          return <span>{t(`status.${getStatus(item)}`)}</span>;
        }

        return (
          <Dropdown
            ariaLabel={t('common.changeStatus')}
            selectedKey={getStatus(item)}
            options={allowed.map(status => ({ key: status, text: t(`status.${status}`) }))}
            onChange={(_, option) => option && String(option.key) !== getStatus(item) && changeStatus(item, String(option.key))}
          />
        );
      }
    };
  });

  const starColumn: IColumn = {
    key: 'favorite', name: t('fav.column'), ariaLabel: t('fav.column'), minWidth: 28, maxWidth: 28,
    onRender: (item: T) => {
      const on = favorites.isFavorite(item.id);
      const title = props.getTitle(item);
      return (
        <button
          type="button"
          aria-pressed={on}
          aria-label={`${on ? t('fav.remove') : t('fav.add')}: ${title}`}
          title={on ? t('fav.remove') : t('fav.add')}
          onClick={event => { event.stopPropagation(); favorites.toggle(item, title).catch(err => setLocalError(err instanceof Error ? err.message : t('common.unknownError'))); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, color: on ? '#d29200' : undefined }}
        >
          <span aria-hidden="true">{on ? '★' : '☆'}</span>
        </button>
      );
    }
  };
  tableColumns.unshift(starColumn);

  const openFromInsights = (item: T): void => {
    setSelectedId(item.id);
    if (props.renderDetail) {
      setIsDetailOpen(true);
    } else {
      openEdit(item);
    }
  };

  const commandItems: ICommandBarItemProps[] = props.hideNew ? [] : [
    { key: 'new', text: t(`${textKey}.new`), iconProps: { iconName: 'Add' }, onClick: openCreate }
  ];
  commandItems.push({ key: 'edit', text: t('common.edit'), iconProps: { iconName: 'Edit' }, disabled: !selected || (!!props.canEdit && !props.canEdit(selected)), onClick: () => openEdit(selected) });
  if (props.renderDetail) {
    commandItems.push({ key: 'details', text: t('common.details'), iconProps: { iconName: 'Info' }, disabled: !selected, onClick: () => setIsDetailOpen(true) });
  }
  if (!props.hideArchive) {
    commandItems.push({ key: 'archive', text: t('common.archive'), iconProps: { iconName: 'Archive' }, disabled: !selected || !props.canArchive(selected), onClick: () => setConfirm('archive') });
  }
  commandItems.push(
    { key: 'delete', text: t('common.delete'), iconProps: { iconName: 'Delete' }, disabled: !selected || (!!props.canDelete && !props.canDelete(selected)), onClick: () => setConfirm('delete') }
  );
  (props.extraCommands ? props.extraCommands(selected) : []).forEach(item => commandItems.push(item));

  const farItems: ICommandBarItemProps[] = [
    { key: 'refresh', text: t('common.refresh'), iconProps: { iconName: 'Refresh' }, onClick: () => { state.reload().catch(() => undefined); } },
    { key: 'export', text: t('common.exportCsv'), iconProps: { iconName: 'Download' }, disabled: visible.length === 0, onClick: exportCsv },
    { key: 'import', text: t('common.importCsv'), iconProps: { iconName: 'Upload' }, onClick: () => setIsCsvOpen(true) }
  ].filter(item => !(props.hideImport && item.key === 'import'));

  const hasAnyItems = scoped.length > 0;

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <Text variant="xLarge" as="h2">{t(`${textKey}.title`)}</Text>

      <CommandBar items={commandItems} farItems={farItems} ariaLabel={t(`${textKey}.title`)} />

      <Insights<T>
        items={scoped}
        statuses={statuses}
        getStatus={getStatus}
        getTitle={props.getTitle}
        config={props.insights}
        favoriteIds={favorites.ids}
        activeChip={chip}
        onChip={setChip}
        activeStatus={view.status}
        onStatus={status => setView(prev => ({ ...prev, status }))}
        onOpen={openFromInsights}
        open={insightsOpen}
        onToggle={() => setInsightsOpen(prev => { writeMemory(`insights.${props.listName}`, !prev); return !prev; })}
      />

      <Stack horizontal wrap verticalAlign="end" tokens={{ childrenGap: 12 }}>
        <Stack.Item grow styles={{ root: { minWidth: 220, maxWidth: 420 } }}>
          <SearchBox
            componentRef={searchRef}
            placeholder={t('common.search')}
            ariaLabel={t('common.search')}
            value={view.search}
            onChange={(_, value) => setView(prev => ({ ...prev, search: value ?? '' }))}
            onClear={() => setView(prev => ({ ...prev, search: '' }))}
          />
        </Stack.Item>
        {statuses.length > 0 && (
          <Dropdown
            ariaLabel={t('common.filterByStatus')}
            selectedKey={view.status}
            options={statusFilterOptions}
            styles={{ root: { minWidth: 180 } }}
            onChange={(_, option) => setView(prev => ({ ...prev, status: option ? String(option.key) : '' }))}
          />
        )}
        {statuses.length > 0 && !props.hideClosedToggle && (
          <Toggle
            label={t('common.showClosed')}
            inlineLabel
            checked={view.showClosed}
            onChange={(_, checked) => setView(prev => ({ ...prev, showClosed: !!checked }))}
          />
        )}
      </Stack>

      <div aria-live="polite">
        {shownError && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setLocalError(undefined)}>{shownError}</MessageBar>}
        {state.loading && <MessageBar>{t('common.loading')}</MessageBar>}
      </div>

      {props.extraContent}

      {!state.loading && !hasAnyItems && !state.error && (
        <Stack tokens={{ childrenGap: 8 }}>
          <Text>{t(`${textKey}.empty`)}</Text>
          <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
            {!props.hideNew && <PrimaryButton text={t(`${textKey}.new`)} iconProps={{ iconName: 'Add' }} onClick={openCreate} />}
            {!props.hideImport && <DefaultButton text={t('common.importCsv')} iconProps={{ iconName: 'Upload' }} onClick={() => setIsCsvOpen(true)} />}
          </Stack>
        </Stack>
      )}
      {hasAnyItems && visible.length === 0 && <Text>{t('common.noResults')}</Text>}

      {visible.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <DetailsList
            items={visible}
            columns={tableColumns}
            selection={selectionRef.current}
            selectionMode={SelectionMode.single}
            setKey="entity"
            layoutMode={DetailsListLayoutMode.justified}
            onItemInvoked={item => {
              if (props.canEdit && !props.canEdit(item as T)) {
                if (props.renderDetail) {
                  setSelectedId((item as T).id);
                  setIsDetailOpen(true);
                }
                return;
              }
              openEdit(item as T);
            }}
            ariaLabelForGrid={t(`${textKey}.title`)}
          />
        </div>
      )}

      <Panel
        isOpen={isFormOpen}
        onDismiss={() => setIsFormOpen(false)}
        type={PanelType.large}
        closeButtonAriaLabel={t('common.close')}
        headerText={selected ? t(`${textKey}.edit`) : t(`${textKey}.create`)}
      >
        <Stack tokens={{ childrenGap: 12 }}>
          {shownError && <MessageBar messageBarType={MessageBarType.error}>{shownError}</MessageBar>}
          <FormGrid>
            {props.renderForm({ form, setForm, errors, original: selected, isEdit: !!selected, service })}
          </FormGrid>
          {props.approval && selected && (
            <ApprovalSection
              entity={props.approval.entity}
              title={props.getTitle(selected)}
              businessId={props.approval.getBusinessId(selected)}
              approval={getApproval(selected)}
              gate={gate}
              service={service}
              userEmail={userEmail}
              onRequest={requestApprovalFor}
              onDecide={decideApprovalFor}
            />
          )}
          {props.approval && !selected && gate && gate.needsExistingItem && (
            <MessageBar messageBarType={MessageBarType.warning}>{t('approval.createFirst', { rule: t(gate.blockedBy[0].titleKey) })}</MessageBar>
          )}
          {service.capabilities.attachments && !props.hideAttachments && (
            <AttachmentsSection service={service} listName={props.listName} itemId={selected ? selected.id : undefined} />
          )}
          {selected && (selected.modified || selected.editor) && (
            <Text variant="small">{t('common.lastModified', { date: (selected.modified ?? '').slice(0, 10), user: selected.editor || '—' })}</Text>
          )}
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <PrimaryButton text={t('common.save')} onClick={() => { save().catch(() => undefined); }} />
            <DefaultButton text={t('common.cancel')} onClick={() => setIsFormOpen(false)} />
          </Stack>
        </Stack>
      </Panel>

      {props.renderDetail && (
        <Panel
          isOpen={isDetailOpen && !!selected}
          onDismiss={() => setIsDetailOpen(false)}
          type={PanelType.medium}
          closeButtonAriaLabel={t('common.close')}
          headerText={selected ? props.getTitle(selected) : ''}
        >
          {isDetailOpen && selected && props.renderDetail(selected)}
        </Panel>
      )}

      <CsvImportPanel<T>
        isOpen={isCsvOpen}
        onDismiss={() => setIsCsvOpen(false)}
        headers={props.csvColumns.map(column => column.header)}
        template={{ fileName: `template-${props.csvFileName}`, content: () => toCsv([props.newItem()], props.csvColumns, language === 'es' ? ';' : ',') }}
        fromRow={props.csvFromRow}
        validate={csvValidate}
        buildPayload={props.buildPayload}
        createItem={payload => service.createItem(props.listName, payload)}
        onFinished={() => { state.reload().catch(() => undefined); }}
      />

      <ConfirmDialog
        isOpen={confirm !== undefined}
        title={confirm === 'delete' ? t('confirm.deleteTitle') : t('confirm.archiveTitle')}
        message={confirm === 'delete'
          ? t('confirm.deleteMessage', { name: selected ? props.getTitle(selected) : '' })
          : t('confirm.archiveMessage', { name: selected ? props.getTitle(selected) : '' })}
        confirmText={confirm === 'delete' ? t('common.delete') : t('common.archive')}
        onConfirm={() => { runConfirmed().catch(() => undefined); }}
        onCancel={() => setConfirm(undefined)}
      />
    </Stack>
  );
}

export default EntityScreen;
