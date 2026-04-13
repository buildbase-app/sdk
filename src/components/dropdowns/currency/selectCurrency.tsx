import { useTranslation } from '../../../i18n';
import { CommandSelect } from '../../ui/command-select';
import { currencies } from './currencies';

interface SelectCurrencyProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectCurrency({ value, onChange }: SelectCurrencyProps) {
  const { t } = useTranslation();
  const options = currencies.map(c => ({
    value: c.value,
    label: c.text,
    icon: c.icon ?? undefined,
  }));

  return (
    <CommandSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={t('dropdowns.searchCurrency')}
      emptyLabel={t('dropdowns.chooseCurrency')}
    />
  );
}
