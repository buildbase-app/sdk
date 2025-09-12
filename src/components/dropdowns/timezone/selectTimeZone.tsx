'use client';

import React, { useState } from 'react';
import { CheckCheck, ChevronsUpDown } from 'lucide-react';

import { Button } from '../../ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '../../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

import { cn } from '../../../lib/utils';

import { timezones } from './timezones';

interface ITimeZone {
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectTimeZone(props: ITimeZone) {
  const [value, setValue] = useState(props.value || '');
  const [open, setOpen] = useState(false);

  const selected = timezones.find(timezone => {
    return timezone.value == value;
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
          {selected?.text || 'Choose timezone'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 overflow-hidden text-ellipsis">
        <Command>
          <CommandInput placeholder="Choose timezone..." />
          <CommandList>
            <CommandGroup>
              {timezones.map((timezone: any) => (
                <CommandItem
                  className={cn('whitespace-nowrap text-left', {
                    'text-green-500': value === timezone.value,
                  })}
                  key={timezone.value}
                  value={timezone.value}
                  defaultValue={timezone.value}
                  onSelect={_currentValue => {
                    const currentValue = timezone.value;
                    setValue(currentValue);
                    if (props.onChange && typeof props.onChange === 'function') {
                      props.onChange(currentValue);
                    }
                    setOpen(false);
                  }}
                >
                  {value === timezone.value && (
                    <CheckCheck
                      className={cn(
                        'mr-2 h-4 w-4 text-green-400',
                        value === timezone.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  )}
                  {String(timezone.text).trim()}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
