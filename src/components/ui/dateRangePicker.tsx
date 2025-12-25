'use client';

import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subQuarters,
  subWeeks,
  subYears,
} from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { DateRange } from 'react-day-picker';

import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

import { cn } from '../../lib/utils';

interface IProps {
  className?: string;
  start: Date | undefined;
  end: Date | undefined;
  onChange: (date: DateRange) => void;
}

export function DatePickerWithRange({ className, onChange, start, end }: IProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: start,
    to: end,
  });
  React.useEffect(() => {
    setDate({
      from: start,
      to: end,
    });
  }, [start, end]);
  const options = [
    'Today',
    'Yesterday',
    'This week',
    'Last week',
    'This month',
    'Last month',
    'Month to date',
    'This Quarter',
    'Last Quarter',
    'This Year',
    'Last Year',
    'Year to date',
  ];
  function chooseFromOptions(option: string) {
    const now = new Date();
    const startOfDate = startOfDay(now);
    const endOfDate = endOfDay(now);
    const startOfYesterday = startOfDay(subDays(now, 1));
    const endOfYesterday = endOfDay(subDays(now, 1));
    const startOfThisWeek = startOfWeek(now);
    const endOfThisWeek = endOfWeek(now);
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);
    const startOfThisYear = startOfYear(now);
    const startOfLastMonth = startOfMonth(subMonths(now, 1));
    const endOfLastMonth = endOfMonth(subMonths(now, 1));
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));
    const startOfThisQuarter = startOfQuarter(now);
    const endOfThisQuarter = endOfQuarter(now);
    const startOfLastQuarter = startOfQuarter(subQuarters(now, 1));
    const endOfLastQuarter = endOfQuarter(subQuarters(now, 1));
    const endOfThisYear = endOfYear(now);
    const startOfLastYear = startOfYear(subYears(now, 1));
    const endOfLastYear = endOfYear(subYears(now, 1));

    switch (option) {
      case 'Today':
        setDate({ from: startOfDate, to: endOfDate });
        break;
      case 'Yesterday':
        setDate({
          from: startOfYesterday,
          to: endOfYesterday,
        });
        break;
      case 'This week':
        setDate({
          from: startOfThisWeek,
          to: endOfThisWeek,
        });
        break;
      case 'Last week':
        setDate({
          from: lastWeekStart,
          to: lastWeekEnd,
        });
        break;
      case 'This month':
        setDate({
          from: startOfThisMonth,
          to: endOfThisMonth,
        });
        break;
      case 'Last month':
        setDate({
          from: startOfLastMonth,
          to: endOfLastMonth,
        });
        break;
      case 'Month to date':
        setDate({
          from: startOfThisMonth,
          to: startOfDate,
        });
        break;
      case 'This Quarter':
        setDate({
          from: startOfThisQuarter,
          to: endOfThisQuarter,
        });
        break;
      case 'Last Quarter':
        setDate({
          from: startOfLastQuarter,
          to: endOfLastQuarter,
        });
        break;
      case 'This Year':
        setDate({
          from: startOfThisYear,
          to: endOfThisYear,
        });
        break;
      case 'Last Year':
        setDate({
          from: startOfLastYear,
          to: endOfLastYear,
        });
        break;
      case 'Year to date':
        setDate({
          from: startOfThisYear,
          to: startOfDate,
        });
        break;
      default:
        break;
    }
  }
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover
        open={open}
        onOpenChange={open => {
          setOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex justify-between items-center p-1.5">
            <div className="flex items-center flex-col h-full">
              {options.map((option, index) => (
                <Button
                  className={cn({
                    'w-full rounded-md': true,
                    'rounded-t-none': index !== 0,
                    'rounded-b-none': index !== options.length - 1,
                  })}
                  key={option}
                  size={'sm'}
                  value={option}
                  variant={'outline'}
                  onClick={() => {
                    chooseFromOptions(option);
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={data => {
                setDate(data);
              }}
              numberOfMonths={2}
            />
          </div>
          <div className="flex justify-end px-3 pb-2">
            <Button
              onClick={() => {
                if (date) {
                  onChange(date);
                  setOpen(false);
                }
              }}
              size={'sm'}
              className="my-1"
              variant="default"
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
