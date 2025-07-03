import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// List of components that need to be updated
const components = [
  'aspect-ratio.tsx',
  'buttonIcon.tsx',
  'calendar.tsx',
  'context-menu.tsx',
  'dateRangePicker.tsx',
  'dropdown-menu.tsx',
  'heading.tsx',
  'hover-card.tsx',
  'label.tsx',
  'menubar.tsx',
  'navigation-menu.tsx',
  'popover.tsx',
  'progress.tsx',
  'radio-group.tsx',
  'scroll-area.tsx',
  'select.tsx',
  'separator.tsx',
  'sheet.tsx',
  'skeleton.tsx',
  'slider.tsx',
  'switch.tsx',
  'table.tsx',
  'tabs.tsx',
  'textarea.tsx',
  'toast.tsx',
  'toaster.tsx',
  'toggle.tsx',
  'tooltip.tsx',
  'use-toast.ts'
]

// Common Tailwind classes that need prefixing
const classMappings = {
  // Layout
  flex: 'saas-os-flex',
  'inline-flex': 'saas-os-inline-flex',
  grid: 'saas-os-grid',
  block: 'saas-os-block',
  'inline-block': 'saas-os-inline-block',
  inline: 'saas-os-inline',
  hidden: 'saas-os-hidden',

  // Spacing
  'p-0': 'saas-os-p-0',
  'p-1': 'saas-os-p-1',
  'p-2': 'saas-os-p-2',
  'p-3': 'saas-os-p-3',
  'p-4': 'saas-os-p-4',
  'p-5': 'saas-os-p-5',
  'p-6': 'saas-os-p-6',
  'px-2': 'saas-os-px-2',
  'px-3': 'saas-os-px-3',
  'px-4': 'saas-os-px-4',
  'px-6': 'saas-os-px-6',
  'py-1': 'saas-os-py-1',
  'py-2': 'saas-os-py-2',
  'py-3': 'saas-os-py-3',
  'py-4': 'saas-os-py-4',
  'py-6': 'saas-os-py-6',
  'pt-0': 'saas-os-pt-0',
  'pt-1': 'saas-os-pt-1',
  'pt-2': 'saas-os-pt-2',
  'pt-4': 'saas-os-pt-4',
  'pb-4': 'saas-os-pb-4',
  'pl-7': 'saas-os-pl-7',
  'pr-4': 'saas-os-pr-4',
  'm-0': 'saas-os-m-0',
  'm-1': 'saas-os-m-1',
  'm-2': 'saas-os-m-2',
  'm-4': 'saas-os-m-4',
  'mx-1': 'saas-os-mx-1',
  'mx-2': 'saas-os-mx-2',
  'mx-4': 'saas-os-mx-4',
  'my-1': 'saas-os-my-1',
  'my-2': 'saas-os-my-2',
  'my-4': 'saas-os-my-4',
  'mt-1': 'saas-os-mt-1',
  'mt-2': 'saas-os-mt-2',
  'mt-4': 'saas-os-mt-4',
  'mb-1': 'saas-os-mb-1',
  'mb-2': 'saas-os-mb-2',
  'mb-4': 'saas-os-mb-4',
  'ml-2': 'saas-os-ml-2',
  'ml-auto': 'saas-os-ml-auto',
  'mr-2': 'saas-os-mr-2',
  'mr-4': 'saas-os-mr-4',

  // Sizing
  'w-full': 'saas-os-w-full',
  'w-4': 'saas-os-w-4',
  'w-5': 'saas-os-w-5',
  'w-6': 'saas-os-w-6',
  'w-8': 'saas-os-w-8',
  'w-10': 'saas-os-w-10',
  'w-12': 'saas-os-w-12',
  'w-16': 'saas-os-w-16',
  'w-20': 'saas-os-w-20',
  'w-24': 'saas-os-w-24',
  'w-32': 'saas-os-w-32',
  'w-40': 'saas-os-w-40',
  'w-48': 'saas-os-w-48',
  'w-56': 'saas-os-w-56',
  'w-64': 'saas-os-w-64',
  'w-72': 'saas-os-w-72',
  'w-80': 'saas-os-w-80',
  'w-96': 'saas-os-w-96',
  'w-auto': 'saas-os-w-auto',
  'w-screen': 'saas-os-w-screen',
  'w-svw': 'saas-os-w-svw',
  'w-lvw': 'saas-os-w-lvw',
  'w-dvw': 'saas-os-w-dvw',
  'w-min': 'saas-os-w-min',
  'w-max': 'saas-os-w-max',
  'w-fit': 'saas-os-w-fit',
  'w-px': 'saas-os-w-px',
  'w-0.5': 'saas-os-w-0.5',
  'w-1': 'saas-os-w-1',
  'w-1.5': 'saas-os-w-1.5',
  'w-2': 'saas-os-w-2',
  'w-2.5': 'saas-os-w-2.5',
  'w-3': 'saas-os-w-3',
  'w-3.5': 'saas-os-w-3.5',
  'w-7': 'saas-os-w-7',
  'w-9': 'saas-os-w-9',
  'w-11': 'saas-os-w-11',
  'w-14': 'saas-os-w-14',
  'w-28': 'saas-os-w-28',
  'w-36': 'saas-os-w-36',
  'w-44': 'saas-os-w-44',
  'w-52': 'saas-os-w-52',
  'w-60': 'saas-os-w-60',
  'w-68': 'saas-os-w-68',
  'w-76': 'saas-os-w-76',
  'w-84': 'saas-os-w-84',
  'w-88': 'saas-os-w-88',
  'w-92': 'saas-os-w-92',
  'w-100': 'saas-os-w-100',
  'h-full': 'saas-os-h-full',
  'h-4': 'saas-os-h-4',
  'h-5': 'saas-os-h-5',
  'h-6': 'saas-os-h-6',
  'h-8': 'saas-os-h-8',
  'h-10': 'saas-os-h-10',
  'h-12': 'saas-os-h-12',
  'h-16': 'saas-os-h-16',
  'h-20': 'saas-os-h-20',
  'h-24': 'saas-os-h-24',
  'h-32': 'saas-os-h-32',
  'h-40': 'saas-os-h-40',
  'h-48': 'saas-os-h-48',
  'h-56': 'saas-os-h-56',
  'h-64': 'saas-os-h-64',
  'h-72': 'saas-os-h-72',
  'h-80': 'saas-os-h-80',
  'h-96': 'saas-os-h-96',
  'h-auto': 'saas-os-h-auto',
  'h-screen': 'saas-os-h-screen',
  'h-svh': 'saas-os-h-svh',
  'h-lvh': 'saas-os-h-lvh',
  'h-dvh': 'saas-os-h-dvh',
  'h-min': 'saas-os-h-min',
  'h-max': 'saas-os-h-max',
  'h-fit': 'saas-os-h-fit',
  'h-px': 'saas-os-h-px',
  'h-0.5': 'saas-os-h-0.5',
  'h-1': 'saas-os-h-1',
  'h-1.5': 'saas-os-h-1.5',
  'h-2': 'saas-os-h-2',
  'h-2.5': 'saas-os-h-2.5',
  'h-3': 'saas-os-h-3',
  'h-3.5': 'saas-os-h-3.5',
  'h-7': 'saas-os-h-7',
  'h-9': 'saas-os-h-9',
  'h-11': 'saas-os-h-11',
  'h-14': 'saas-os-h-14',
  'h-28': 'saas-os-h-28',
  'h-36': 'saas-os-h-36',
  'h-44': 'saas-os-h-44',
  'h-52': 'saas-os-h-52',
  'h-60': 'saas-os-h-60',
  'h-68': 'saas-os-h-68',
  'h-76': 'saas-os-h-76',
  'h-84': 'saas-os-h-84',
  'h-88': 'saas-os-h-88',
  'h-92': 'saas-os-h-92',
  'h-100': 'saas-os-h-100',

  // Typography
  'text-xs': 'saas-os-text-xs',
  'text-sm': 'saas-os-text-sm',
  'text-base': 'saas-os-text-base',
  'text-lg': 'saas-os-text-lg',
  'text-xl': 'saas-os-text-xl',
  'text-2xl': 'saas-os-text-2xl',
  'text-3xl': 'saas-os-text-3xl',
  'text-4xl': 'saas-os-text-4xl',
  'text-5xl': 'saas-os-text-5xl',
  'text-6xl': 'saas-os-text-6xl',
  'text-7xl': 'saas-os-text-7xl',
  'text-8xl': 'saas-os-text-8xl',
  'text-9xl': 'saas-os-text-9xl',
  'text-center': 'saas-os-text-center',
  'text-left': 'saas-os-text-left',
  'text-right': 'saas-os-text-right',
  'text-justify': 'saas-os-text-justify',
  'text-start': 'saas-os-text-start',
  'text-end': 'saas-os-text-end',
  'font-medium': 'saas-os-font-medium',
  'font-semibold': 'saas-os-font-semibold',
  'font-bold': 'saas-os-font-bold',
  'leading-none': 'saas-os-leading-none',
  'leading-tight': 'saas-os-leading-tight',
  'leading-snug': 'saas-os-leading-snug',
  'leading-normal': 'saas-os-leading-normal',
  'leading-relaxed': 'saas-os-leading-relaxed',
  'leading-loose': 'saas-os-leading-loose',
  'tracking-tight': 'saas-os-tracking-tight',
  'tracking-widest': 'saas-os-tracking-widest',

  // Colors
  'bg-background': 'saas-os-bg-background',
  'bg-foreground': 'saas-os-bg-foreground',
  'bg-primary': 'saas-os-bg-primary',
  'bg-primary-foreground': 'saas-os-bg-primary-foreground',
  'bg-secondary': 'saas-os-bg-secondary',
  'bg-secondary-foreground': 'saas-os-bg-secondary-foreground',
  'bg-muted': 'saas-os-bg-muted',
  'bg-muted-foreground': 'saas-os-bg-muted-foreground',
  'bg-accent': 'saas-os-bg-accent',
  'bg-accent-foreground': 'saas-os-bg-accent-foreground',
  'bg-destructive': 'saas-os-bg-destructive',
  'bg-destructive-foreground': 'saas-os-bg-destructive-foreground',
  'bg-border': 'saas-os-bg-border',
  'bg-input': 'saas-os-bg-input',
  'bg-ring': 'saas-os-bg-ring',
  'bg-popover': 'saas-os-bg-popover',
  'bg-popover-foreground': 'saas-os-bg-popover-foreground',
  'bg-card': 'saas-os-bg-card',
  'bg-card-foreground': 'saas-os-bg-card-foreground',
  'bg-transparent': 'saas-os-bg-transparent',
  'text-foreground': 'saas-os-text-foreground',
  'text-primary': 'saas-os-text-primary',
  'text-primary-foreground': 'saas-os-text-primary-foreground',
  'text-secondary': 'saas-os-text-secondary',
  'text-secondary-foreground': 'saas-os-text-secondary-foreground',
  'text-muted-foreground': 'saas-os-text-muted-foreground',
  'text-accent': 'saas-os-text-accent',
  'text-accent-foreground': 'saas-os-text-accent-foreground',
  'text-destructive': 'saas-os-text-destructive',
  'text-destructive-foreground': 'saas-os-text-destructive-foreground',
  'text-border': 'saas-os-text-border',
  'text-input': 'saas-os-text-input',
  'text-ring': 'saas-os-text-ring',
  'text-popover': 'saas-os-text-popover',
  'text-popover-foreground': 'saas-os-text-popover-foreground',
  'text-card': 'saas-os-text-card',
  'text-card-foreground': 'saas-os-text-card-foreground',
  'text-current': 'saas-os-text-current',
  'text-transparent': 'saas-os-text-transparent',
  'text-black': 'saas-os-text-black',
  'text-white': 'saas-os-text-white',
  'border-border': 'saas-os-border-border',
  'border-input': 'saas-os-border-input',
  'border-ring': 'saas-os-border-ring',
  'border-primary': 'saas-os-border-primary',
  'border-secondary': 'saas-os-border-secondary',
  'border-muted': 'saas-os-border-muted',
  'border-accent': 'saas-os-border-accent',
  'border-destructive': 'saas-os-border-destructive',
  'border-transparent': 'saas-os-border-transparent',
  'border-current': 'saas-os-border-current',
  'border-black': 'saas-os-border-black',
  'border-white': 'saas-os-border-white',

  // Borders
  border: 'saas-os-border',
  'border-0': 'saas-os-border-0',
  'border-2': 'saas-os-border-2',
  'border-4': 'saas-os-border-4',
  'border-8': 'saas-os-border-8',
  'border-t': 'saas-os-border-t',
  'border-r': 'saas-os-border-r',
  'border-b': 'saas-os-border-b',
  'border-l': 'saas-os-border-l',
  'border-t-0': 'saas-os-border-t-0',
  'border-r-0': 'saas-os-border-r-0',
  'border-b-0': 'saas-os-border-b-0',
  'border-l-0': 'saas-os-border-l-0',
  'rounded-sm': 'saas-os-rounded-sm',
  rounded: 'saas-os-rounded',
  'rounded-md': 'saas-os-rounded-md',
  'rounded-lg': 'saas-os-rounded-lg',
  'rounded-xl': 'saas-os-rounded-xl',
  'rounded-2xl': 'saas-os-rounded-2xl',
  'rounded-3xl': 'saas-os-rounded-3xl',
  'rounded-full': 'saas-os-rounded-full',
  'rounded-none': 'saas-os-rounded-none',
  'rounded-t-sm': 'saas-os-rounded-t-sm',
  'rounded-t': 'saas-os-rounded-t',
  'rounded-t-md': 'saas-os-rounded-t-md',
  'rounded-t-lg': 'saas-os-rounded-t-lg',
  'rounded-t-xl': 'saas-os-rounded-t-xl',
  'rounded-t-2xl': 'saas-os-rounded-t-2xl',
  'rounded-t-3xl': 'saas-os-rounded-t-3xl',
  'rounded-t-full': 'saas-os-rounded-t-full',
  'rounded-t-none': 'saas-os-rounded-t-none',
  'rounded-r-sm': 'saas-os-rounded-r-sm',
  'rounded-r': 'saas-os-rounded-r',
  'rounded-r-md': 'saas-os-rounded-r-md',
  'rounded-r-lg': 'saas-os-rounded-r-lg',
  'rounded-r-xl': 'saas-os-rounded-r-xl',
  'rounded-r-2xl': 'saas-os-rounded-r-2xl',
  'rounded-r-3xl': 'saas-os-rounded-r-3xl',
  'rounded-r-full': 'saas-os-rounded-r-full',
  'rounded-r-none': 'saas-os-rounded-r-none',
  'rounded-b-sm': 'saas-os-rounded-b-sm',
  'rounded-b': 'saas-os-rounded-b',
  'rounded-b-md': 'saas-os-rounded-b-md',
  'rounded-b-lg': 'saas-os-rounded-b-lg',
  'rounded-b-xl': 'saas-os-rounded-b-xl',
  'rounded-b-2xl': 'saas-os-rounded-b-2xl',
  'rounded-b-3xl': 'saas-os-rounded-b-3xl',
  'rounded-b-full': 'saas-os-rounded-b-full',
  'rounded-b-none': 'saas-os-rounded-b-none',
  'rounded-l-sm': 'saas-os-rounded-l-sm',
  'rounded-l': 'saas-os-rounded-l',
  'rounded-l-md': 'saas-os-rounded-l-md',
  'rounded-l-lg': 'saas-os-rounded-l-lg',
  'rounded-l-xl': 'saas-os-rounded-l-xl',
  'rounded-l-2xl': 'saas-os-rounded-l-2xl',
  'rounded-l-3xl': 'saas-os-rounded-l-3xl',
  'rounded-l-full': 'saas-os-rounded-l-full',
  'rounded-l-none': 'saas-os-rounded-l-none',
  'rounded-tl-sm': 'saas-os-rounded-tl-sm',
  'rounded-tl': 'saas-os-rounded-tl',
  'rounded-tl-md': 'saas-os-rounded-tl-md',
  'rounded-tl-lg': 'saas-os-rounded-tl-lg',
  'rounded-tl-xl': 'saas-os-rounded-tl-xl',
  'rounded-tl-2xl': 'saas-os-rounded-tl-2xl',
  'rounded-tl-3xl': 'saas-os-rounded-tl-3xl',
  'rounded-tl-full': 'saas-os-rounded-tl-full',
  'rounded-tl-none': 'saas-os-rounded-tl-none',
  'rounded-tr-sm': 'saas-os-rounded-tr-sm',
  'rounded-tr': 'saas-os-rounded-tr',
  'rounded-tr-md': 'saas-os-rounded-tr-md',
  'rounded-tr-lg': 'saas-os-rounded-tr-lg',
  'rounded-tr-xl': 'saas-os-rounded-tr-xl',
  'rounded-tr-2xl': 'saas-os-rounded-tr-2xl',
  'rounded-tr-3xl': 'saas-os-rounded-tr-3xl',
  'rounded-tr-full': 'saas-os-rounded-tr-full',
  'rounded-tr-none': 'saas-os-rounded-tr-none',
  'rounded-bl-sm': 'saas-os-rounded-bl-sm',
  'rounded-bl': 'saas-os-rounded-bl',
  'rounded-bl-md': 'saas-os-rounded-bl-md',
  'rounded-bl-lg': 'saas-os-rounded-bl-lg',
  'rounded-bl-xl': 'saas-os-rounded-bl-xl',
  'rounded-bl-2xl': 'saas-os-rounded-bl-2xl',
  'rounded-bl-3xl': 'saas-os-rounded-bl-3xl',
  'rounded-bl-full': 'saas-os-rounded-bl-full',
  'rounded-bl-none': 'saas-os-rounded-bl-none',
  'rounded-br-sm': 'saas-os-rounded-br-sm',
  'rounded-br': 'saas-os-rounded-br',
  'rounded-br-md': 'saas-os-rounded-br-md',
  'rounded-br-lg': 'saas-os-rounded-br-lg',
  'rounded-br-xl': 'saas-os-rounded-br-xl',
  'rounded-br-2xl': 'saas-os-rounded-br-2xl',
  'rounded-br-3xl': 'saas-os-rounded-br-3xl',
  'rounded-br-full': 'saas-os-rounded-br-full',
  'rounded-br-none': 'saas-os-rounded-br-none',

  // Effects
  shadow: 'saas-os-shadow',
  'shadow-sm': 'saas-os-shadow-sm',
  'shadow-md': 'saas-os-shadow-md',
  'shadow-lg': 'saas-os-shadow-lg',
  'shadow-xl': 'saas-os-shadow-xl',
  'shadow-2xl': 'saas-os-shadow-2xl',
  'shadow-inner': 'saas-os-shadow-inner',
  'shadow-none': 'saas-os-shadow-none',
  'opacity-50': 'saas-os-opacity-50',
  'opacity-70': 'saas-os-opacity-70',
  'opacity-100': 'saas-os-opacity-100',
  'backdrop-blur-sm': 'saas-os-backdrop-blur-sm',

  // Transitions
  'transition-all': 'saas-os-transition-all',
  'transition-colors': 'saas-os-transition-colors',
  'transition-opacity': 'saas-os-transition-opacity',
  'transition-transform': 'saas-os-transition-transform',
  'duration-200': 'saas-os-duration-200',

  // Positioning
  relative: 'saas-os-relative',
  absolute: 'saas-os-absolute',
  fixed: 'saas-os-fixed',
  sticky: 'saas-os-sticky',
  'inset-0': 'saas-os-inset-0',
  'top-4': 'saas-os-top-4',
  'right-4': 'saas-os-right-4',
  'bottom-4': 'saas-os-bottom-4',
  'left-4': 'saas-os-left-4',
  'z-50': 'saas-os-z-50',

  // Flexbox
  'flex-1': 'saas-os-flex-1',
  'flex-col': 'saas-os-flex-col',
  'flex-col-reverse': 'saas-os-flex-col-reverse',
  'flex-row': 'saas-os-flex-row',
  'flex-row-reverse': 'saas-os-flex-row-reverse',
  'items-center': 'saas-os-items-center',
  'items-start': 'saas-os-items-start',
  'items-end': 'saas-os-items-end',
  'items-stretch': 'saas-os-items-stretch',
  'items-baseline': 'saas-os-items-baseline',
  'justify-center': 'saas-os-justify-center',
  'justify-start': 'saas-os-justify-start',
  'justify-end': 'saas-os-justify-end',
  'justify-between': 'saas-os-justify-between',
  'justify-around': 'saas-os-justify-around',
  'justify-evenly': 'saas-os-justify-evenly',
  'gap-2': 'saas-os-gap-2',
  'gap-4': 'saas-os-gap-4',
  'space-x-2': 'saas-os-space-x-2',
  'space-y-1.5': 'saas-os-space-y-1.5',
  'space-y-2': 'saas-os-space-y-2',
  'space-y-4': 'saas-os-space-y-4',
  'shrink-0': 'saas-os-shrink-0',

  // Grid
  'grid-cols-1': 'saas-os-grid-cols-1',
  'grid-cols-2': 'saas-os-grid-cols-2',
  'grid-cols-3': 'saas-os-grid-cols-3',
  'grid-cols-4': 'saas-os-grid-cols-4',
  'grid-cols-5': 'saas-os-grid-cols-5',
  'grid-cols-6': 'saas-os-grid-cols-6',
  'grid-cols-7': 'saas-os-grid-cols-7',
  'grid-cols-8': 'saas-os-grid-cols-8',
  'grid-cols-9': 'saas-os-grid-cols-9',
  'grid-cols-10': 'saas-os-grid-cols-10',
  'grid-cols-11': 'saas-os-grid-cols-11',
  'grid-cols-12': 'saas-os-grid-cols-12',
  'grid-cols-none': 'saas-os-grid-cols-none',
  'grid-rows-1': 'saas-os-grid-rows-1',
  'grid-rows-2': 'saas-os-grid-rows-2',
  'grid-rows-3': 'saas-os-grid-rows-3',
  'grid-rows-4': 'saas-os-grid-rows-4',
  'grid-rows-5': 'saas-os-grid-rows-5',
  'grid-rows-6': 'saas-os-grid-rows-6',
  'grid-rows-none': 'saas-os-grid-rows-none',

  // Overflow
  'overflow-hidden': 'saas-os-overflow-hidden',
  'overflow-x-hidden': 'saas-os-overflow-x-hidden',
  'overflow-y-auto': 'saas-os-overflow-y-auto',

  // Cursor
  'cursor-default': 'saas-os-cursor-default',
  'cursor-pointer': 'saas-os-cursor-pointer',
  'cursor-not-allowed': 'saas-os-cursor-not-allowed',

  // Select
  'select-none': 'saas-os-select-none',

  // Outline
  'outline-none': 'saas-os-outline-none',

  // Ring
  'ring-1': 'saas-os-ring-1',
  'ring-2': 'saas-os-ring-2',
  'ring-ring': 'saas-os-ring-ring',
  'ring-offset-2': 'saas-os-ring-offset-2',
  'ring-offset-background': 'saas-os-ring-offset-background',

  // Transform
  'translate-x-[-50%]': 'saas-os-translate-x-[-50%]',
  'translate-y-[-50%]': 'saas-os-translate-y-[-50%]',
  'translate-y-[-3px]': 'saas-os-translate-y-[-3px]',
  'rotate-180': 'saas-os-rotate-180',

  // Max width/height
  'max-w-lg': 'saas-os-max-w-lg',
  'max-h-[300px]': 'saas-os-max-h-[300px]',

  // Aspect ratio
  'aspect-square': 'saas-os-aspect-square',

  // Screen reader
  'sr-only': 'saas-os-sr-only',

  // Hover states
  'hover:underline': 'hover:saas-os-underline',
  'hover:opacity-100': 'hover:saas-os-opacity-100',
  'hover:bg-primary/80': 'hover:saas-os-bg-primary/80',
  'hover:bg-secondary/80': 'hover:saas-os-bg-secondary/80',
  'hover:bg-destructive/80': 'hover:saas-os-bg-destructive/80',
  'hover:bg-accent': 'hover:saas-os-bg-accent',
  'hover:text-accent-foreground': 'hover:saas-os-text-accent-foreground',

  // Focus states
  'focus:outline-none': 'focus:saas-os-outline-none',
  'focus:ring-2': 'focus:saas-os-ring-2',
  'focus:ring-ring': 'focus:saas-os-ring-ring',
  'focus:ring-offset-2': 'focus:saas-os-ring-offset-2',
  'focus-visible:outline-none': 'focus-visible:saas-os-outline-none',
  'focus-visible:ring-1': 'focus-visible:saas-os-ring-1',
  'focus-visible:ring-2': 'focus-visible:saas-os-ring-2',
  'focus-visible:ring-ring': 'focus-visible:saas-os-ring-ring',
  'focus-visible:ring-offset-2': 'focus-visible:saas-os-ring-offset-2',

  // Disabled states
  'disabled:cursor-not-allowed': 'disabled:saas-os-cursor-not-allowed',
  'disabled:opacity-50': 'disabled:saas-os-opacity-50',
  'disabled:pointer-events-none': 'disabled:saas-os-pointer-events-none',

  // Data states
  'data-[state=open]:animate-in': 'data-[state=open]:saas-os-animate-in',
  'data-[state=closed]:animate-out': 'data-[state=closed]:saas-os-animate-out',
  'data-[state=closed]:fade-out-0': 'data-[state=closed]:saas-os-fade-out-0',
  'data-[state=open]:fade-in-0': 'data-[state=open]:saas-os-fade-in-0',
  'data-[state=closed]:zoom-out-95': 'data-[state=closed]:saas-os-zoom-out-95',
  'data-[state=open]:zoom-in-95': 'data-[state=open]:saas-os-zoom-in-95',
  'data-[state=closed]:slide-out-to-left-1/2':
    'data-[state=closed]:saas-os-slide-out-to-left-1/2',
  'data-[state=closed]:slide-out-to-top-[48%]':
    'data-[state=closed]:saas-os-slide-out-to-top-[48%]',
  'data-[state=open]:slide-in-from-left-1/2':
    'data-[state=open]:saas-os-slide-in-from-left-1/2',
  'data-[state=open]:slide-in-from-top-[48%]':
    'data-[state=open]:saas-os-slide-in-from-top-[48%]',
  'data-[state=open]:bg-accent': 'data-[state=open]:saas-os-bg-accent',
  'data-[state=open]:text-muted-foreground':
    'data-[state=open]:saas-os-text-muted-foreground',
  'data-[state=checked]:bg-primary': 'data-[state=checked]:saas-os-bg-primary',
  'data-[state=checked]:text-primary-foreground':
    'data-[state=checked]:saas-os-text-primary-foreground',
  'data-[disabled]:pointer-events-none':
    'data-[disabled]:saas-os-pointer-events-none',
  'data-[disabled]:opacity-50': 'data-[disabled]:saas-os-opacity-50',

  // Aria states
  'aria-selected:bg-accent': 'aria-selected:saas-os-bg-accent',
  'aria-selected:text-accent-foreground':
    'aria-selected:saas-os-text-accent-foreground',

  // Placeholder
  'placeholder:text-muted-foreground':
    'placeholder:saas-os-text-muted-foreground',

  // File input
  'file:border-0': 'file:saas-os-border-0',
  'file:bg-transparent': 'file:saas-os-bg-transparent',
  'file:text-sm': 'file:saas-os-text-sm',
  'file:font-medium': 'file:saas-os-font-medium',

  // Complex selectors
  '[&>svg+div]:translate-y-[-3px]': '[&>svg+div]:saas-os-translate-y-[-3px]',
  '[&>svg]:absolute': '[&>svg]:saas-os-absolute',
  '[&>svg]:left-4': '[&>svg]:saas-os-left-4',
  '[&>svg]:top-4': '[&>svg]:saas-os-top-4',
  '[&>svg]:text-foreground': '[&>svg]:saas-os-text-foreground',
  '[&>svg~*]:pl-7': '[&>svg~*]:saas-os-pl-7',
  '[&[data-state=open]>svg]:rotate-180':
    '[&[data-state=open]>svg]:saas-os-rotate-180',
  '[&_[cmdk-group-heading]]:px-2': '[&_[cmdk-group-heading]]:saas-os-px-2',
  '[&_[cmdk-group-heading]]:font-medium':
    '[&_[cmdk-group-heading]]:saas-os-font-medium',
  '[&_[cmdk-group-heading]]:text-muted-foreground':
    '[&_[cmdk-group-heading]]:saas-os-text-muted-foreground',
  '[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0':
    '[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:saas-os-pt-0',
  '[&_[cmdk-group]]:px-2': '[&_[cmdk-group]]:saas-os-px-2',
  '[&_[cmdk-input-wrapper]_svg]:h-5':
    '[&_[cmdk-input-wrapper]_svg]:saas-os-h-5',
  '[&_[cmdk-input-wrapper]_svg]:w-5':
    '[&_[cmdk-input-wrapper]_svg]:saas-os-w-5',
  '[&_[cmdk-input]]:h-12': '[&_[cmdk-input]]:saas-os-h-12',
  '[&_[cmdk-item]]:px-2': '[&_[cmdk-item]]:saas-os-px-2',
  '[&_[cmdk-item]]:py-3': '[&_[cmdk-item]]:saas-os-py-3',
  '[&_[cmdk-item]_svg]:h-5': '[&_[cmdk-item]_svg]:saas-os-h-5',
  '[&_[cmdk-item]_svg]:w-5': '[&_[cmdk-item]_svg]:saas-os-w-5',
  '[&_[cmdk-group-heading]]:py-1.5': '[&_[cmdk-group-heading]]:saas-os-py-1.5',
  '[&_[cmdk-group-heading]]:text-xs':
    '[&_[cmdk-group-heading]]:saas-os-text-xs',
  '[&_p]:leading-relaxed': '[&_p]:saas-os-leading-relaxed',

  // Responsive prefixes
  'sm:rounded-lg': 'sm:saas-os-rounded-lg',
  'sm:text-left': 'sm:saas-os-text-left',
  'sm:flex-row': 'sm:saas-os-flex-row',
  'sm:justify-end': 'sm:saas-os-justify-end',
  'sm:space-x-2': 'sm:saas-os-space-x-2',
  'md:w-full': 'md:saas-os-w-full',

  // Dark mode
  'dark:border-destructive': 'dark:saas-os-border-destructive',
  'dark:border-success': 'dark:saas-os-border-success',
  'dark:text-destructive': 'dark:saas-os-text-destructive',
  'dark:text-success': 'dark:saas-os-text-success',

  // Negative margins
  '-mx-1': 'saas-os--mx-1',

  // Height with px
  'h-px': 'saas-os-h-px',

  // Success and warning colors (if defined in your theme)
  'bg-success': 'saas-os-bg-success',
  'bg-success-foreground': 'saas-os-bg-success-foreground',
  'bg-warning': 'saas-os-bg-warning',
  'bg-warning-foreground': 'saas-os-bg-warning-foreground',
  'text-success': 'saas-os-text-success',
  'text-success-foreground': 'saas-os-text-success-foreground',
  'text-warning': 'saas-os-text-warning',
  'text-warning-foreground': 'saas-os-text-warning-foreground',
  'border-success': 'saas-os-border-success',
  'border-success/50': 'saas-os-border-success/50',
  'border-warning': 'saas-os-border-warning',
  'border-warning/50': 'saas-os-border-warning/50',
  'border-destructive/50': 'saas-os-border-destructive/50',
  'bg-primary/80': 'saas-os-bg-primary/80',
  'bg-secondary/80': 'saas-os-bg-secondary/80',
  'bg-destructive/80': 'saas-os-bg-destructive/80',
  'bg-muted/50': 'saas-os-bg-muted/50',
  'bg-destructive/10': 'saas-os-bg-destructive/10',
  'border-destructive/20': 'saas-os-border-destructive/20',
  'bg-background/80': 'saas-os-bg-background/80',

  // Animations
  'animate-accordion-up': 'saas-os-animate-accordion-up',
  'animate-accordion-down': 'saas-os-animate-accordion-down',
  'animate-in': 'saas-os-animate-in',
  'animate-out': 'saas-os-animate-out',
  'fade-out-0': 'saas-os-fade-out-0',
  'fade-in-0': 'saas-os-fade-in-0',
  'zoom-out-95': 'saas-os-zoom-out-95',
  'zoom-in-95': 'saas-os-zoom-in-95',
  'slide-out-to-left-1/2': 'saas-os-slide-out-to-left-1/2',
  'slide-out-to-top-[48%]': 'saas-os-slide-out-to-top-[48%]',
  'slide-in-from-left-1/2': 'saas-os-slide-in-from-left-1/2',
  'slide-in-from-top-[48%]': 'saas-os-slide-in-from-top-[48%]'
}

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let updated = false

    // Replace classes that are not already prefixed
    for (const [oldClass, newClass] of Object.entries(classMappings)) {
      // Only replace if the class is not already prefixed with saas-os-
      const regex = new RegExp(
        `(?<!saas-os-)${oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'g'
      )
      if (regex.test(content)) {
        content = content.replace(regex, newClass)
        updated = true
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Updated: ${filePath}`)
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`)
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message)
  }
}

// Update all components
console.log('🔄 Updating UI components with saas-os- prefix...\n')

components.forEach((component) => {
  const filePath = path.join(__dirname, 'src', 'components', 'ui', component)
  if (fs.existsSync(filePath)) {
    updateFile(filePath)
  } else {
    console.log(`⚠️  File not found: ${filePath}`)
  }
})

console.log('\n✨ All components updated!')
