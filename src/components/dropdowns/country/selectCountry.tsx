import { CommandSelect } from '../../ui/command-select';
import { countries } from './countries';

interface SelectCountryProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectCountry({ value, onChange }: SelectCountryProps) {
  const options = countries.map(c => ({
    value: c.value,
    label: c.text,
    icon: c.flag,
  }));

  return (
    <CommandSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Choose country..."
      emptyLabel="Choose country"
    />
  );
}
