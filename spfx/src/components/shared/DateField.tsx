import * as React from 'react';
import { DatePicker, DayOfWeek, defaultDatePickerStrings } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { fromDayKey, isValidDayKey, toDayKey } from '../../rules/dates';

export interface IDateFieldProps {
  label: string;
  /** Day key (YYYY-MM-DD) or empty. */
  value: string | undefined;
  onChange: (value: string) => void;
  errorMessage?: string;
}

/** Calendar date input that reads and writes YYYY-MM-DD day keys, with typing allowed. */
const DateField: React.FC<IDateFieldProps> = ({ label, value, onChange, errorMessage }) => {
  const t = useT();
  // Text typed by the user that is not a valid date yet: keep showing it instead of erasing it.
  const [draft, setDraft] = React.useState<string | undefined>();

  return (
    <DatePicker
      label={label}
      value={fromDayKey(value)}
      firstDayOfWeek={DayOfWeek.Monday}
      strings={defaultDatePickerStrings}
      placeholder="YYYY-MM-DD"
      allowTextInput
      formatDate={date => (date ? toDayKey(date) : '')}
      parseDateFromString={text => {
        const trimmed = text.trim();
        setDraft(trimmed.length > 0 && !isValidDayKey(trimmed) ? trimmed : undefined);
        return fromDayKey(trimmed) ?? null;
      }}
      onSelectDate={date => {
        setDraft(undefined);
        onChange(date ? toDayKey(date) : '');
      }}
      textField={{
        errorMessage: errorMessage ?? (draft ? t('validation.dateInvalid') : undefined)
      }}
    />
  );
};

export default DateField;
