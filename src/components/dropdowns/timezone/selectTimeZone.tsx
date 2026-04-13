'use client';

import { useTranslation } from '../../../i18n';
import { CommandSelect } from '../../ui/command-select';
import { timezones } from './timezones';

interface SelectTimeZoneProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectTimeZone({ value, onChange }: SelectTimeZoneProps) {
  const { t } = useTranslation();
  const options = timezones.map(tz => ({
    value: tz.value,
    label: tz.text,
  }));

  return (
    <CommandSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={t('dropdowns.searchTimezone')}
      emptyLabel={t('dropdowns.chooseTimezone')}
    />
  );
}
