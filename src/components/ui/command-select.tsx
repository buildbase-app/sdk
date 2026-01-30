'use client';

import { CheckCheck, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from './button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

import { cn } from '../../lib/utils';

export interface CommandSelectOption {
  value: string;
  label: string;
  icon?: string;
}

export interface CommandSelectProps {
  options: CommandSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}

export function CommandSelect({
  options,
  value: valueProp,
  onChange,
  placeholder = 'Search...',
  emptyLabel = 'Choose option',
}: CommandSelectProps) {
  const [value, setValue] = useState(valueProp ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (valueProp !== undefined) setValue(valueProp);
  }, [valueProp]);

  const handleSelect = (v: string) => {
    setValue(v);
    onChange?.(v);
    setOpen(false);
  };

  const selected = options.find(o => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between overflow-hidden text-ellipsis"
        >
          {selected ? (
            <div>
              {String(selected.label).trim()}
              {selected.icon && (
                <span className="ml-2 text-xs text-muted-foreground">{selected.icon}</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{emptyLabel}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 overflow-hidden text-ellipsis">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  className={cn('whitespace-nowrap text-left', {
                    'text-green-500': value === option.value,
                  })}
                  key={option.value}
                  value={option.value}
                  defaultValue={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  {value === option.value && (
                    <CheckCheck
                      className={cn(
                        'mr-2 h-4 w-4 text-green-400',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  )}
                  {String(option.label).trim()}
                  {option.icon && (
                    <span className="ml-2 text-xs text-muted-foreground">{option.icon}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
