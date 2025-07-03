'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import moment from 'moment'
import { DateRange } from 'react-day-picker'

import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

import { cn } from '../../lib/utils'

interface IProps {
  className?: string
  start: Date | undefined
  end: Date | undefined
  onChange: (date: DateRange) => void
}

export function DatePickerWithRange({
  className,
  onChange,
  start,
  end
}: IProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: start,
    to: end
  })
  React.useEffect(() => {
    setDate({
      from: start,
      to: end
    })
  }, [start, end])
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
    'Year to date'
  ]
  function chooseFromOptions(option: string) {
    const startOfDate = moment().startOf('day').toDate()
    const endOfDate = moment().endOf('day').toDate()
    const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate()
    const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate()
    const startOfWeek = moment().startOf('week').toDate()
    const endOfWeek = moment().endOf('week').toDate()
    const startOfMonth = moment().startOf('month').toDate()
    const endOfMonth = moment().endOf('month').toDate()
    const startOfYear = moment().startOf('year').toDate()
    const startOfLastMonth = moment()
      .subtract(1, 'month')
      .startOf('month')
      .toDate()
    const endOfLastMonth = moment().subtract(1, 'month').endOf('month').toDate()

    switch (option) {
      case 'Today':
        setDate({ from: startOfDate, to: endOfDate })
        break
      case 'Yesterday':
        setDate({
          from: startOfYesterday,
          to: endOfYesterday
        })
        break
      case 'This week':
        setDate({
          from: startOfWeek,
          to: endOfWeek
        })
        break
      case 'Last week':
        setDate({
          from: moment().subtract(1, 'week').startOf('week').toDate(),
          to: moment().subtract(1, 'week').endOf('week').toDate()
        })
        break
      case 'This month':
        setDate({
          from: startOfMonth,
          to: endOfMonth
        })
        break
      case 'Last month':
        setDate({
          from: startOfLastMonth,
          to: endOfLastMonth
        })
        break
      case 'Month to date':
        setDate({
          from: startOfMonth,
          to: startOfDate
        })
        break
      case 'This Quarter':
        setDate({
          from: moment().startOf('quarter').toDate(),
          to: moment().endOf('quarter').toDate()
        })
        break
      case 'Last Quarter':
        setDate({
          from: moment().subtract(1, 'quarter').startOf('quarter').toDate(),
          to: moment().subtract(1, 'quarter').endOf('quarter').toDate()
        })
        break
      case 'This Year':
        setDate({
          from: moment().startOf('year').toDate(),
          to: moment().endOf('year').toDate()
        })
        break
      case 'Last Year':
        setDate({
          from: moment().subtract(1, 'year').startOf('year').toDate(),
          to: moment().subtract(1, 'year').endOf('year').toDate()
        })
        break
      case 'Year to date':
        setDate({
          from: startOfYear,
          to: startOfDate
        })
        break
      default:
        break
    }
  }
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover
        open={open}
        onOpenChange={(open) => {
          setOpen(open)
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id='date'
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <div className='flex justify-between items-center p-1.5'>
            <div className='flex items-center flex-col h-full'>
              {options.map((option, index) => (
                <Button
                  className={cn({
                    'w-full rounded-md': true,
                    'rounded-t-none': index !== 0,
                    'rounded-b-none': index !== options.length - 1
                  })}
                  key={option}
                  size={'sm'}
                  value={option}
                  variant={'outline'}
                  onClick={() => {
                    chooseFromOptions(option)
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode='range'
              defaultMonth={date?.from}
              selected={date}
              onSelect={(data) => {
                setDate(data)
              }}
              numberOfMonths={2}
            />
          </div>
          <div className='flex justify-end px-3 pb-2'>
            <Button
              onClick={() => {
                if (date) {
                  onChange(date)
                  setOpen(false)
                }
              }}
              size={'sm'}
              className='my-1'
              variant='default'
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
