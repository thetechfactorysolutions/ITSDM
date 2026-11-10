import * as React from 'react';
import { DefaultButton, Dialog, DialogFooter, DialogType, Dropdown, IconButton, IDropdownOption, PrimaryButton, TextField } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { ISavedView, parseViews, removeView, saveView, toTableView } from '../../rules/savedViews';
import { ITableView } from '../../rules/tableView';
import { readMemory, writeMemory } from './viewMemory';

export interface ISavedViewsMenuProps {
  listName: string;
  current: ITableView;
  chipKey: string | undefined;
  onApply: (view: ITableView, chipKey: string | undefined) => void;
}

/** "Views": the ways of looking at this list the person saved, and saving the one on screen. Kept in the browser, per list. */
const SavedViewsMenu: React.FC<ISavedViewsMenuProps> = ({ listName, current, chipKey, onApply }) => {
  const t = useT();
  const key = `views.${listName}`;
  const [views, setViews] = React.useState<ISavedView[]>(() => parseViews(readMemory<unknown>(key)));
  const [active, setActive] = React.useState<string | undefined>();
  const [saving, setSaving] = React.useState<boolean>(false);
  const [name, setName] = React.useState<string>('');
  const [error, setError] = React.useState<string | undefined>();

  const store = (next: ISavedView[]): void => { setViews(next); writeMemory(key, next); };

  const save = (): void => {
    const outcome = saveView(views, name, current, chipKey, `v${Date.now().toString(36)}`);
    if (outcome.error) {
      setError(t(outcome.error === 'empty' ? 'savedViews.errEmpty' : 'savedViews.errTooMany'));
      return;
    }
    store(outcome.views);
    setSaving(false);
    setName('');
    setError(undefined);
  };

  const options: IDropdownOption[] = views.length === 0
    ? [{ key: '__none', text: t('savedViews.none'), disabled: true }]
    : views.map(v => ({ key: v.id, text: v.name }));

  return (
    <>
      <Dropdown
        ariaLabel={t('savedViews.button')}
        placeholder={t('savedViews.button')}
        selectedKey={active ?? null}
        options={options}
        styles={{ root: { minWidth: 150 } }}
        onChange={(_, option) => {
          const chosen = option ? views.filter(v => v.id === option.key)[0] : undefined;
          if (chosen) {
            setActive(chosen.id);
            onApply(toTableView(chosen), chosen.chipKey);
          }
        }}
      />
      <DefaultButton text={t('savedViews.save')} iconProps={{ iconName: 'Save' }} onClick={() => { setName(''); setError(undefined); setSaving(true); }} />
      {active && <IconButton iconProps={{ iconName: 'Delete' }} title={t('savedViews.delete')} ariaLabel={t('savedViews.delete')} onClick={() => { store(removeView(views, active)); setActive(undefined); }} />}
      <Dialog
        hidden={!saving}
        onDismiss={() => setSaving(false)}
        dialogContentProps={{ type: DialogType.normal, title: t('savedViews.save'), subText: t('savedViews.hint') }}
      >
        <TextField label={t('savedViews.name')} value={name} maxLength={40} errorMessage={error} onChange={(_, value) => setName(value ?? '')} onKeyDown={event => { if (event.key === 'Enter') { save(); } }} autoFocus />
        <DialogFooter>
          <PrimaryButton text={t('common.save')} onClick={save} />
          <DefaultButton text={t('common.cancel')} onClick={() => setSaving(false)} />
        </DialogFooter>
      </Dialog>
    </>
  );
};

export default SavedViewsMenu;
