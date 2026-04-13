import { useTranslation } from '../../../i18n';
import { CommandSelect } from '../../ui/command-select';
import { languages } from './languages';

interface SelectLanguageProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectLanguage({ value, onChange }: SelectLanguageProps) {
  const { t } = useTranslation();
  const options = languages.map(l => ({
    value: l.value,
    label: l.label,
    icon: l.flag,
  }));

  return (
    <CommandSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={t('dropdowns.searchLanguage')}
      emptyLabel={t('dropdowns.chooseLanguage')}
    />
  );
}
