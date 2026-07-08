'use client';

import { CheckCheck, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

import { useTranslation } from '../../i18n';
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
  const { t } = useTranslation();
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
        {/* Styled to match the Input primitive so dropdowns sit visually
            flush with the other form fields (same radius/height/border) */}
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 sm:h-9 w-full justify-between rounded-md border-input bg-transparent px-3 py-1 text-base sm:text-sm font-normal shadow-sm hover:bg-transparent"
        >
          {selected ? (
            <div className="truncate">
              {String(selected.label).trim()}
              {selected.icon && (
                <span className="ms-2 text-xs text-muted-foreground">{selected.icon}</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{emptyLabel}</span>
          )}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 overflow-hidden text-ellipsis" asChild>
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{t('dropdowns.noResults')}</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  className={cn('whitespace-nowrap text-start', {
                    'text-success': value === option.value,
                  })}
                  key={option.value}
                  value={option.value}
                  // Let the search input match the visible label (and icon text),
                  // not just the code — "germ" should find Germany, not only "de"
                  keywords={[option.label]}
                  onSelect={() => handleSelect(option.value)}
                >
                  {value === option.value && (
                    <CheckCheck
                      className={cn(
                        'me-2 h-4 w-4 text-success',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  )}
                  {String(option.label).trim()}
                  {option.icon && (
                    <span className="ms-2 text-xs text-muted-foreground">{option.icon}</span>
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
