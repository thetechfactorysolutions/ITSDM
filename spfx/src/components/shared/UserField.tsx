import * as React from 'react';
import { IPersonaProps, Label, NormalPeoplePicker, Text } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import { IDataStore } from '../../data/IDataStore';

export interface IUserFieldProps {
  label: string;
  /** Email (UPN) of the selected user, or empty. */
  value: string | undefined;
  onChange: (email: string) => void;
  service: IDataStore;
  required?: boolean;
  errorMessage?: string;
}

const toPersona = (email: string): IPersonaProps => ({ text: email, secondaryText: email, id: email });

/** Single-user picker backed by the store's people search (the directory in SharePoint, names already in the data otherwise). Stores the user's email. */
const UserField: React.FC<IUserFieldProps> = ({ label, value, onChange, service, required, errorMessage }) => {
  const t = useT();
  const [searchError, setSearchError] = React.useState<string | undefined>();

  const resolveSuggestions = async (filter: string): Promise<IPersonaProps[]> => {
    try {
      const users = await service.searchUsers(filter);
      setSearchError(undefined);
      return users.map(user => ({ text: user.displayName, secondaryText: user.email, id: user.email }));
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : t('common.unknownError'));
      return [];
    }
  };

  const selectedItems: IPersonaProps[] = value ? [toPersona(value)] : [];
  const shownError = errorMessage ?? searchError;

  return (
    <div>
      <Label required={required}>{label}</Label>
      <NormalPeoplePicker
        itemLimit={1}
        resolveDelay={300}
        selectedItems={selectedItems}
        onResolveSuggestions={resolveSuggestions}
        onChange={items => onChange(items && items.length > 0 ? (items[0].secondaryText ?? items[0].text ?? '') : '')}
        inputProps={{ 'aria-label': label, placeholder: t('field.userSearchPlaceholder') }}
      />
      {shownError && <Text variant="small" styles={{ root: { color: '#a4262c' } }}>{shownError}</Text>}
    </div>
  );
};

export default UserField;
