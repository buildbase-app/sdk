import { CheckCheck, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '../../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

import { cn } from '../../../lib/utils';

import { currencies } from './currencies';

interface ITimeZone {
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectCurrency(props: ITimeZone) {
  const [value, setValue] = useState(props.value || '');
  const [open, setOpen] = useState(false);

  const selected = currencies.find(c => {
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
              <span className="ml-2 text-xs text-muted-foreground">{selected.icon}</span>
            </div>
          )}
          {!selected && 'Choose Currency' && (
            <span className="text-muted-foreground">Choose Currency</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 overflow-hidden text-ellipsis">
        <Command>
          <CommandInput placeholder="Choose currency..." />
          <CommandList>
            <CommandGroup>
              {currencies.map(currency => (
                <CommandItem
                  className={cn('whitespace-nowrap text-left', {
                    'text-green-500': value === currency.value,
                  })}
                  key={currency.value}
                  value={currency.value}
                  defaultValue={currency.value}
                  onSelect={_currentValue => {
                    const currentValue = currency.value;
                    setValue(currentValue);
                    if (props.onChange && typeof props.onChange === 'function') {
                      props.onChange(currentValue);
                    }
                    setOpen(false);
                  }}
                >
                  {value === currency.value && (
                    <CheckCheck
                      className={cn(
                        'mr-2 h-4 w-4 text-green-400',
                        value === currency.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  )}
                  {String(currency.text).trim()}
                  <span className="ml-2 text-xs text-muted-foreground">{currency.icon}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
