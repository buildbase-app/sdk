import { Context } from '../api'
import {
  ReactNode,
  ChangeEvent,
  FocusEvent,
  MouseEvent,
  KeyboardEvent
} from 'react'

// Form Data Types
export interface BetaFormData {
  name?: string
  email: string
}

export interface BetaFormResponse {
  success: boolean
  message: string
}

// Base Component Props
export interface BaseComponentProps {
  className?: string
  style?: React.CSSProperties
  id?: string
  role?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-hidden'?: boolean
  'aria-live'?: 'polite' | 'assertive' | 'off'
  'aria-atomic'?: boolean
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all'
  'aria-busy'?: boolean
  'aria-disabled'?: boolean
  'aria-invalid'?: boolean
  'aria-required'?: boolean
  'aria-selected'?: boolean
  'aria-expanded'?: boolean
  'aria-controls'?: string
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
  'aria-posinset'?: number
  'aria-setsize'?: number
  'aria-level'?: number
  'aria-orientation'?: 'horizontal' | 'vertical'
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other'
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-valuenow'?: number
  'aria-valuetext'?: string
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  'aria-modal'?: boolean
  'aria-multiline'?: boolean
  'aria-multiselectable'?: boolean
  'aria-placeholder'?: string
  'aria-pressed'?: boolean | 'mixed'
  'aria-readonly'?: boolean
}

// Input Component Props
export interface FormInputProps extends BaseComponentProps {
  type: string
  name: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onBlur: (e: FocusEvent<HTMLInputElement>) => void
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  onKeyUp?: (e: KeyboardEvent<HTMLInputElement>) => void
  onKeyPress?: (e: KeyboardEvent<HTMLInputElement>) => void
  disabled?: boolean
  placeholder?: string
  required?: boolean
  autoComplete?: string
  autoFocus?: boolean
  readOnly?: boolean
  maxLength?: number
  minLength?: number
  pattern?: string
  title?: string
  tabIndex?: number
}

// Label Component Props
export interface FormLabelProps extends BaseComponentProps {
  htmlFor: string
  children: ReactNode
  onClick?: (e: MouseEvent<HTMLLabelElement>) => void
  onMouseEnter?: (e: MouseEvent<HTMLLabelElement>) => void
  onMouseLeave?: (e: MouseEvent<HTMLLabelElement>) => void
  required?: boolean
}

// Error Component Props
export interface FormErrorProps extends BaseComponentProps {
  children: ReactNode
}

// Button Component Props
export interface FormButtonProps extends BaseComponentProps {
  type: 'submit' | 'button' | 'reset'
  disabled?: boolean
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  onMouseEnter?: (e: MouseEvent<HTMLButtonElement>) => void
  onMouseLeave?: (e: MouseEvent<HTMLButtonElement>) => void
  onFocus?: (e: FocusEvent<HTMLButtonElement>) => void
  onBlur?: (e: FocusEvent<HTMLButtonElement>) => void
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void
  children: ReactNode
  form?: string
  formAction?: string
  formMethod?: string
  formNoValidate?: boolean
  formTarget?: string
  name?: string
  value?: string
  tabIndex?: number
}

// Message Component Props
export interface FormMessageProps extends BaseComponentProps {
  type: 'error' | 'success' | 'info' | 'warning'
  children: ReactNode
  onAnimationEnd?: (e: React.AnimationEvent) => void
  onTransitionEnd?: (e: React.TransitionEvent) => void
}

// Description Component Props
export interface FormDescriptionProps extends BaseComponentProps {
  children: ReactNode
}

// Group Component Props
export interface FormGroupProps extends BaseComponentProps {
  children: ReactNode
}

// Field Component Props
export interface FormFieldProps extends BaseComponentProps {
  name: string
  children: ReactNode
}

// Item Component Props
export interface FormItemProps extends BaseComponentProps {
  children: ReactNode
}

// Form Component Props
export interface FormProps extends BaseComponentProps {
  children: ReactNode
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  method?: 'get' | 'post'
  action?: string
  encType?: string
  noValidate?: boolean
  target?: string
}

// Component Registry
export interface FormComponents {
  // Base form components
  Form: React.ComponentType<FormProps>
  FormField: React.ComponentType<FormFieldProps>
  FormItem: React.ComponentType<FormItemProps>
  FormGroup: React.ComponentType<FormGroupProps>

  // Input components
  Input: React.ComponentType<FormInputProps>
  Label: React.ComponentType<FormLabelProps>
  Description: React.ComponentType<FormDescriptionProps>

  // Feedback components
  Error: React.ComponentType<FormErrorProps>
  Message: React.ComponentType<FormMessageProps>

  // Action components
  Button: React.ComponentType<FormButtonProps>
}

// Provider Props
export interface SaaSOSProviderProps {
  serverUrl: string
  version: string
  orgId: string
  children: ReactNode
  components: FormComponents
  defaultProps?: {
    [K in keyof FormComponents]?: Partial<
      React.ComponentProps<FormComponents[K]>
    >
  }
}

// Context Value
export interface SaaSOSContextValue {
  context: Context
  components: FormComponents
  defaultProps?: SaaSOSProviderProps['defaultProps']
}

export type { Context }
