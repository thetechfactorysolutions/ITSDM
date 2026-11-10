import * as React from 'react';
import { ComboBox, IComboBoxOption } from '@fluentui/react';
import { useT } from '../../i18n/I18n';

export interface ILinkOption {
  /** Business id stored in the list column, such as INIT-20261108-AB12CD. */
  id: string;
  title: string;
}

export interface ILinkFieldProps {
  label: string;
  /** Business id currently stored, or empty. */
  value: string | undefined;
  options: ILinkOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
}

/**
 * Picker for a link to another item. It stores the business id (as the lists already do) but the
 * user searches by title. A stored id that no longer exists is still shown, so editing an item
 * never silently drops its link.
 */
const LinkField: React.FC<ILinkFieldProps> = ({ label, value, options, onChange, disabled }) => {
  const t = useT();

  const comboOptions: IComboBoxOption[] = React.useMemo(() => {
    const list: IComboBoxOption[] = [{ key: '', text: t('common.none') }];
    options.forEach(option => list.push({ key: option.id, text: `${option.title} (${option.id})` }));

    if (value && !options.some(option => option.id === value)) {
      list.push({ key: value, text: `${value} (${t('link.missing')})` });
    }

    return list;
  }, [options, value, t]);

  return (
    <ComboBox
      label={label}
      disabled={disabled}
      options={comboOptions}
      selectedKey={value ?? ''}
      autoComplete="on"
      allowFreeform={false}
      useComboBoxAsMenuWidth
      onChange={(_, option) => onChange(option ? String(option.key) : '')}
    />
  );
};

export default LinkField;
