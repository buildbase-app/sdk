'use client';

import { CommandSelect } from '../../ui/command-select';
import { timezones } from './timezones';

interface SelectTimeZoneProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectTimeZone({ value, onChange }: SelectTimeZoneProps) {
  const options = timezones.map(t => ({
    value: t.value,
    label: t.text,
  }));

  return (
    <CommandSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Choose timezone..."
      emptyLabel="Choose timezone"
    />
  );
}
