import { CheckCheck, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '../../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

import { cn } from '../../../lib/utils';

import { countries } from './countries';

interface ITimeZone {
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectCountry(props: ITimeZone) {
  const [value, setValue] = useState(props.value || '');
  const [open, setOpen] = useState(false);

  const selected = countries.find(c => {
    return c.value == value;
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between overflow-hidden text-ellipsis"
        >
          {selected?.text && (
            <div>
              {String(selected.text).trim()}
              <span className="ml-2 text-xs text-muted-foreground">{selected.flag}</span>
            </div>
          )}
          {!selected && 'Choose country' && (
            <span className="text-muted-foreground">Choose country</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 overflow-hidden text-ellipsis">
        <Command>
          <CommandInput placeholder="Choose country..." />
          <CommandList>
            <CommandGroup>
              {countries.map(country => (
                <CommandItem
                  className={cn('whitespace-nowrap text-left', {
                    'text-green-500': value === country.value,
                  })}
                  key={country.value}
                  value={country.value}
                  defaultValue={country.value}
                  onSelect={_currentValue => {
                    const currentValue = country.value;
                    setValue(currentValue);
                    if (props.onChange && typeof props.onChange === 'function') {
                      props.onChange(currentValue);
                    }
                    setOpen(false);
                  }}
                >
                  {value === country.value && (
                    <CheckCheck
                      className={cn(
                        'mr-2 h-4 w-4 text-green-400',
                        value === country.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  )}
                  {String(country.text).trim()}
                  <span className="ml-2 text-xs text-muted-foreground">{country.flag}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
