import * as React from 'react'
import {
  useFormContext,
  Controller,
  FormProvider,
  FieldValues,
  FieldPath
} from 'react-hook-form'
import { useSaaSOS } from '../../providers/ContextProvider'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)
const FormItemContext = React.createContext<{ id: string }>({ id: '' })

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const fieldState = getFieldState(fieldContext.name, formState)

  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    formMessageId: `${itemContext.id}-form-item-message`,
    ...fieldState
  }
}

interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName
  children?: React.ReactNode
  className?: string
}

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  children,
  className
}: FormFieldProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name }}>
      <div className={className} role='group' aria-labelledby={`${name}-label`}>
        {children}
      </div>
    </FormFieldContext.Provider>
  )
}

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ children, className, ...props }, ref) => {
    const id = React.useId()

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </FormItemContext.Provider>
    )
  }
)
FormItem.displayName = 'FormItem'

interface FormLabelProps {
  children?: React.ReactNode
  required?: boolean
  className?: string
  htmlFor?: string
}

const FormLabel = ({
  children,
  required,
  className,
  htmlFor,
  ...props
}: FormLabelProps) => {
  const { error, formItemId } = useFormField()
  const { components } = useSaaSOS()

  return (
    <components.Label
      {...props}
      className={className}
      htmlFor={htmlFor || formItemId}
      data-invalid={error ? 'true' : 'false'}
      data-required={required ? 'true' : 'false'}
    >
      {children} {required && '*'}
    </components.Label>
  )
}

interface FormControlProps {
  type?: string
  className?: string
  required?: boolean
}

const FormControl = ({
  type = 'text',
  className,
  required,
  ...props
}: FormControlProps) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
  const { components } = useSaaSOS()

  return (
    <Controller
      render={({ field }) => (
        <components.Input
          {...field}
          {...props}
          className={className}
          type={type}
          id={formItemId}
          aria-describedby={
            error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId
          }
          aria-invalid={!!error}
          aria-required={required}
        />
      )}
      name={useFormField().name}
    />
  )
}

interface FormMessageProps {
  children?: React.ReactNode
  className?: string
}

const FormMessage = ({ children, className, ...props }: FormMessageProps) => {
  const { error, formMessageId } = useFormField()
  const { components } = useSaaSOS()

  if (!error) return null

  return (
    <components.Error
      className={className}
      id={formMessageId}
      role='alert'
      aria-live='polite'
      {...props}
    >
      {children}
    </components.Error>
  )
}

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage }
