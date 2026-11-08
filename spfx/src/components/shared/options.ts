import { IDropdownOption } from '@fluentui/react';
import { TranslateFn } from '../../i18n/I18n';

/** Dropdown options for a list of stored values, shown translated: prefix "status" -> status.OPEN. */
export const toOptions = (values: string[], t: TranslateFn, prefix: string = 'status'): IDropdownOption[] =>
  values.map(value => ({ key: value, text: t(`${prefix}.${value}`) }));
