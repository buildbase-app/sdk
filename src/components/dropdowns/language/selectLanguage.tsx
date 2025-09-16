import { CheckCheck, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '../../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

import { cn } from '../../../lib/utils';

import { languages } from './languages';

interface ITimeZone {
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectLanguage(props: ITimeZone) {
  const [value, setValue] = useState(props.value || '');
  const [open, setOpen] = useState(false);

  const selected = languages.find(language => {
    return language.value == value;
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
          {selected && (
            <div>
              {String(selected.label).trim()}
              <span className="ml-2 text-xs text-muted-foreground">{selected.flag}</span>
            </div>
          )}
          {!selected && 'Choose language'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 overflow-hidden text-ellipsis">
        <Command>
          <CommandInput placeholder="Choose timezone..." />
          <CommandList>
            <CommandGroup>
              {languages.map(language => (
                <CommandItem
                  className={cn('whitespace-nowrap text-left', {
                    'text-green-500': value === language.value,
                  })}
                  key={language.value}
                  value={language.value}
                  defaultValue={language.value}
                  onSelect={_currentValue => {
                    const currentValue = language.value;
                    setValue(currentValue);
                    if (props.onChange && typeof props.onChange === 'function') {
                      props.onChange(currentValue);
                    }
                    setOpen(false);
                  }}
                >
                  {value === language.value && (
                    <CheckCheck
                      className={cn(
                        'mr-2 h-4 w-4 text-green-400',
                        value === language.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  )}
                  {String(language.label).trim()}
                  <span className="ml-2 text-xs text-muted-foreground">{language.flag}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
