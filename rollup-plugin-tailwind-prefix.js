// Rollup plugin to add saas-os- prefix to Tailwind classes in JSX/TSX files
import { createFilter } from '@rollup/pluginutils';

// Common Tailwind classes that need prefixing
const tailwindClasses = [
  // Layout
  'flex', 'inline-flex', 'grid', 'block', 'inline-block', 'inline', 'hidden',
  
  // Spacing
  'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'px-2', 'px-3', 'px-4', 'px-6',
  'py-1', 'py-2', 'py-3', 'py-4', 'py-6', 'pt-0', 'pt-1', 'pt-2', 'pt-4', 'pb-4',
  'pl-7', 'pr-4', 'm-0', 'm-1', 'm-2', 'm-4', 'mx-1', 'mx-2', 'mx-4', 'my-1', 'my-2',
  'my-4', 'mt-1', 'mt-2', 'mt-4', 'mb-1', 'mb-2', 'mb-4', 'ml-2', 'ml-auto', 'mr-2', 'mr-4',
  
  // Sizing
  'w-full', 'w-4', 'w-5', 'w-6', 'w-8', 'w-10', 'w-12', 'w-16', 'w-20', 'w-24', 'w-32',
  'w-40', 'w-48', 'w-56', 'w-64', 'w-72', 'w-80', 'w-96', 'w-auto', 'w-screen', 'w-svw',
  'w-lvw', 'w-dvw', 'w-min', 'w-max', 'w-fit', 'w-px', 'w-0.5', 'w-1', 'w-1.5', 'w-2',
  'w-2.5', 'w-3', 'w-3.5', 'w-7', 'w-9', 'w-11', 'w-14', 'w-28', 'w-36', 'w-44', 'w-52',
  'w-60', 'w-68', 'w-76', 'w-84', 'w-88', 'w-92', 'w-100',
  'h-full', 'h-4', 'h-5', 'h-6', 'h-8', 'h-10', 'h-12', 'h-16', 'h-20', 'h-24', 'h-32',
  'h-40', 'h-48', 'h-56', 'h-64', 'h-72', 'h-80', 'h-96', 'h-auto', 'h-screen', 'h-svw',
  'h-lvw', 'h-dvw', 'h-min', 'h-max', 'h-fit', 'h-px', 'h-0.5', 'h-1', 'h-1.5', 'h-2',
  'h-2.5', 'h-3', 'h-3.5', 'h-7', 'h-9', 'h-11', 'h-14', 'h-28', 'h-36', 'h-44', 'h-52',
  'h-60', 'h-68', 'h-76', 'h-84', 'h-88', 'h-92', 'h-100',
  
  // Typography
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
  'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl', 'text-center',
  'text-left', 'text-right', 'text-justify', 'text-start', 'text-end', 'font-medium',
  'font-semibold', 'font-bold', 'leading-none', 'leading-tight', 'leading-snug',
  'leading-normal', 'leading-relaxed', 'leading-loose', 'tracking-tight', 'tracking-widest',
  
  // Colors
  'bg-background', 'bg-foreground', 'bg-primary', 'bg-primary-foreground', 'bg-secondary',
  'bg-secondary-foreground', 'bg-muted', 'bg-muted-foreground', 'bg-accent', 'bg-accent-foreground',
  'bg-destructive', 'bg-destructive-foreground', 'bg-border', 'bg-input', 'bg-ring',
  'bg-popover', 'bg-popover-foreground', 'bg-card', 'bg-card-foreground', 'bg-transparent',
  'text-foreground', 'text-primary', 'text-primary-foreground', 'text-secondary',
  'text-secondary-foreground', 'text-muted-foreground', 'text-accent', 'text-accent-foreground',
  'text-destructive', 'text-destructive-foreground', 'text-border', 'text-input', 'text-ring',
  'text-popover', 'text-popover-foreground', 'text-card', 'text-card-foreground', 'text-current',
  'text-transparent', 'text-black', 'text-white',
  'border-border', 'border-input', 'border-ring', 'border-primary', 'border-secondary',
  'border-muted', 'border-accent', 'border-destructive', 'border-transparent', 'border-current',
  'border-black', 'border-white',
  
  // Borders
  'border', 'border-0', 'border-2', 'border-4', 'border-8', 'border-t', 'border-r', 'border-b',
  'border-l', 'border-t-0', 'border-r-0', 'border-b-0', 'border-l-0',
  'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl',
  'rounded-full', 'rounded-none', 'rounded-t-sm', 'rounded-t', 'rounded-t-md', 'rounded-t-lg',
  'rounded-t-xl', 'rounded-t-2xl', 'rounded-t-3xl', 'rounded-t-full', 'rounded-t-none',
  'rounded-r-sm', 'rounded-r', 'rounded-r-md', 'rounded-r-lg', 'rounded-r-xl', 'rounded-r-2xl',
  'rounded-r-3xl', 'rounded-r-full', 'rounded-r-none', 'rounded-b-sm', 'rounded-b', 'rounded-b-md',
  'rounded-b-lg', 'rounded-b-xl', 'rounded-b-2xl', 'rounded-b-3xl', 'rounded-b-full', 'rounded-b-none',
  'rounded-l-sm', 'rounded-l', 'rounded-l-md', 'rounded-l-lg', 'rounded-l-xl', 'rounded-l-2xl',
  'rounded-l-3xl', 'rounded-l-full', 'rounded-l-none', 'rounded-tl-sm', 'rounded-tl', 'rounded-tl-md',
  'rounded-tl-lg', 'rounded-tl-xl', 'rounded-tl-2xl', 'rounded-tl-3xl', 'rounded-tl-full', 'rounded-tl-none',
  'rounded-tr-sm', 'rounded-tr', 'rounded-tr-md', 'rounded-tr-lg', 'rounded-tr-xl', 'rounded-tr-2xl',
  'rounded-tr-3xl', 'rounded-tr-full', 'rounded-tr-none', 'rounded-bl-sm', 'rounded-bl', 'rounded-bl-md',
  'rounded-bl-lg', 'rounded-bl-xl', 'rounded-bl-2xl', 'rounded-bl-3xl', 'rounded-bl-full', 'rounded-bl-none',
  'rounded-br-sm', 'rounded-br', 'rounded-br-md', 'rounded-br-lg', 'rounded-br-xl', 'rounded-br-2xl',
  'rounded-br-3xl', 'rounded-br-full', 'rounded-br-none',
  
  // Effects
  'shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow-none',
  'opacity-50', 'opacity-70', 'opacity-100', 'backdrop-blur-sm',
  
  // Transitions
  'transition-all', 'transition-colors', 'transition-opacity', 'transition-transform',
  'duration-200',
  
  // Positioning
  'relative', 'absolute', 'fixed', 'sticky', 'inset-0', 'top-4', 'right-4', 'bottom-4', 'left-4', 'z-50',
  
  // Flexbox
  'flex-1', 'flex-col', 'flex-col-reverse', 'flex-row', 'flex-row-reverse',
  'items-center', 'items-start', 'items-end', 'items-stretch', 'items-baseline',
  'justify-center', 'justify-start', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly',
  'gap-2', 'gap-4', 'space-x-2', 'space-y-1.5', 'space-y-2', 'space-y-4', 'shrink-0',
  
  // Grid
  'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6', 'grid-cols-7',
  'grid-cols-8', 'grid-cols-9', 'grid-cols-10', 'grid-cols-11', 'grid-cols-12', 'grid-cols-none',
  'grid-rows-1', 'grid-rows-2', 'grid-rows-3', 'grid-rows-4', 'grid-rows-5', 'grid-rows-6', 'grid-rows-none',
  
  // Overflow
  'overflow-hidden', 'overflow-x-hidden', 'overflow-y-auto',
  
  // Cursor
  'cursor-default', 'cursor-pointer', 'cursor-not-allowed',
  
  // Select
  'select-none',
  
  // Outline
  'outline-none',
  
  // Ring
  'ring-1', 'ring-2', 'ring-ring', 'ring-offset-2', 'ring-offset-background',
  
  // Transform
  'translate-x-[-50%]', 'translate-y-[-50%]', 'translate-y-[-3px]', 'rotate-180',
  
  // Max width/height
  'max-w-lg', 'max-h-[300px]',
  
  // Aspect ratio
  'aspect-square',
  
  // Screen reader
  'sr-only',
  
  // Success and warning colors
  'bg-success', 'bg-success-foreground', 'bg-warning', 'bg-warning-foreground',
  'text-success', 'text-success-foreground', 'text-warning', 'text-warning-foreground',
  'border-success', 'border-success/50', 'border-warning', 'border-warning/50',
  'border-destructive/50', 'bg-primary/80', 'bg-secondary/80', 'bg-destructive/80',
  'bg-muted/50', 'bg-destructive/10', 'border-destructive/20', 'bg-background/80',
  
  // Animations
  'animate-accordion-up', 'animate-accordion-down', 'animate-in', 'animate-out',
  'fade-out-0', 'fade-in-0', 'zoom-out-95', 'zoom-in-95',
  'slide-out-to-left-1/2', 'slide-out-to-top-[48%]', 'slide-in-from-left-1/2', 'slide-in-from-top-[48%]',
  
  // Negative margins
  '-mx-1',
  
  // Height with px
  'h-px'
];

// Create a set for faster lookups
const tailwindClassSet = new Set(tailwindClasses);

// Function to add prefix to a class name
function addPrefix(className) {
  // Skip if already prefixed
  if (className.startsWith('saas-os-')) {
    return className;
  }
  
  // Check if it's a Tailwind class
  if (tailwindClassSet.has(className)) {
    return `saas-os-${className}`;
  }
  
  // Handle pseudo-classes and modifiers
  const parts = className.split(':');
  if (parts.length > 1) {
    const pseudoClass = parts[0];
    const baseClass = parts.slice(1).join(':');
    
    if (tailwindClassSet.has(baseClass)) {
      return `${pseudoClass}:saas-os-${baseClass}`;
    }
  }
  
  // Handle data attributes
  if (className.includes('data-[')) {
    const match = className.match(/^(data-\[[^\]]+\]):(.+)$/);
    if (match) {
      const dataAttr = match[1];
      const baseClass = match[2];
      
      if (tailwindClassSet.has(baseClass)) {
        return `${dataAttr}:saas-os-${baseClass}`;
      }
    }
  }
  
  // Handle aria attributes
  if (className.includes('aria-')) {
    const match = className.match(/^(aria-[^:]+):(.+)$/);
    if (match) {
      const ariaAttr = match[1];
      const baseClass = match[2];
      
      if (tailwindClassSet.has(baseClass)) {
        return `${ariaAttr}:saas-os-${baseClass}`;
      }
    }
  }
  
  // Handle focus states
  if (className.startsWith('focus:')) {
    const baseClass = className.substring(6);
    if (tailwindClassSet.has(baseClass)) {
      return `focus:saas-os-${baseClass}`;
    }
  }
  
  // Handle focus-visible states
  if (className.startsWith('focus-visible:')) {
    const baseClass = className.substring(14);
    if (tailwindClassSet.has(baseClass)) {
      return `focus-visible:saas-os-${baseClass}`;
    }
  }
  
  // Handle hover states
  if (className.startsWith('hover:')) {
    const baseClass = className.substring(6);
    if (tailwindClassSet.has(baseClass)) {
      return `hover:saas-os-${baseClass}`;
    }
  }
  
  // Handle disabled states
  if (className.startsWith('disabled:')) {
    const baseClass = className.substring(9);
    if (tailwindClassSet.has(baseClass)) {
      return `disabled:saas-os-${baseClass}`;
    }
  }
  
  // Handle placeholder
  if (className.startsWith('placeholder:')) {
    const baseClass = className.substring(12);
    if (tailwindClassSet.has(baseClass)) {
      return `placeholder:saas-os-${baseClass}`;
    }
  }
  
  // Handle file input
  if (className.startsWith('file:')) {
    const baseClass = className.substring(5);
    if (tailwindClassSet.has(baseClass)) {
      return `file:saas-os-${baseClass}`;
    }
  }
  
  // Handle responsive prefixes
  const responsiveMatch = className.match(/^(sm:|md:|lg:|xl:|2xl:)(.+)$/);
  if (responsiveMatch) {
    const responsivePrefix = responsiveMatch[1];
    const baseClass = responsiveMatch[2];
    
    if (tailwindClassSet.has(baseClass)) {
      return `${responsivePrefix}saas-os-${baseClass}`;
    }
  }
  
  // Handle dark mode
  if (className.startsWith('dark:')) {
    const baseClass = className.substring(5);
    if (tailwindClassSet.has(baseClass)) {
      return `dark:saas-os-${baseClass}`;
    }
  }
  
  // Handle complex selectors (like [&>svg]:absolute)
  const complexMatch = className.match(/^(\[&[^\]]+\]):(.+)$/);
  if (complexMatch) {
    const selector = complexMatch[1];
    const baseClass = complexMatch[2];
    
    if (tailwindClassSet.has(baseClass)) {
      return `${selector}:saas-os-${baseClass}`;
    }
  }
  
  return className;
}

// Function to process class names in a string
function processClassString(classString) {
  if (!classString) return classString;
  
  return classString
    .split(/\s+/)
    .map(className => addPrefix(className.trim()))
    .filter(Boolean)
    .join(' ');
}

// Function to process className attributes in JSX
function processJSXClassNames(code) {
  // Handle className="..." attributes
  code = code.replace(
    /className\s*=\s*["']([^"']+)["']/g,
    (match, classString) => {
      const processedClasses = processClassString(classString);
      return `className="${processedClasses}"`;
    }
  );
  
  // Handle className={`...`} template literals
  code = code.replace(
    /className\s*=\s*{`([^`]+)`}/g,
    (match, classString) => {
      const processedClasses = processClassString(classString);
      return `className={\`${processedClasses}\`}`;
    }
  );
  
  // Handle className={cn('...', ...)} function calls
  code = code.replace(
    /className\s*=\s*{cn\s*\(\s*["']([^"']+)["']/g,
    (match, classString) => {
      const processedClasses = processClassString(classString);
      return `className={cn("${processedClasses}"`;
    }
  );
  
  // Handle className={cn(`...`, ...)} template literal function calls
  code = code.replace(
    /className\s*=\s*{cn\s*\(\s*`([^`]+)`/g,
    (match, classString) => {
      const processedClasses = processClassString(classString);
      return `className={cn(\`${processedClasses}\``;
    }
  );
  
  return code;
}

export default function tailwindPrefix(options = {}) {
  const filter = createFilter(
    options.include || ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'],
    options.exclude || ['node_modules/**']
  );

  return {
    name: 'tailwind-prefix',
    
    transform(code, id) {
      if (!filter(id)) {
        return null;
      }

      const processedCode = processJSXClassNames(code);
      
      if (processedCode !== code) {
        return {
          code: processedCode,
          map: { mappings: '' }
        };
      }
      
      return null;
    }
  };
} 