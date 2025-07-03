import React, { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useSaaSOS } from '../../providers/ContextProvider'

import { Skeleton } from '../ui/skeleton'
import { FormMessageProps, FormButtonProps } from '../../types'
import { cn } from '../../lib/utils'
import { IBetaConfig } from './api'
import { useBetaForm } from '../../hooks/useBetaForm'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '../ui/form'
import { betaFormSchema, BetaFormValues } from './beta-form'

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko'

interface FormText {
  nameLabel: string
  emailLabel: string
  submitText: string
  submittingText: string
  errorMessage: string
}

const formTexts: Record<Language, FormText> = {
  en: {
    nameLabel: 'Name',
    emailLabel: 'Email',
    submitText: 'Submit',
    submittingText: 'Submitting...',
    errorMessage: 'An error occurred'
  },
  es: {
    nameLabel: 'Nombre',
    emailLabel: 'Correo electrónico',
    submitText: 'Enviar',
    submittingText: 'Enviando...',
    errorMessage: 'Ocurrió un error'
  },
  fr: {
    nameLabel: 'Nom',
    emailLabel: 'Email',
    submitText: 'Soumettre',
    submittingText: 'Soumission...',
    errorMessage: 'Une erreur est survenue'
  },
  de: {
    nameLabel: 'Name',
    emailLabel: 'E-Mail',
    submitText: 'Absenden',
    submittingText: 'Wird gesendet...',
    errorMessage: 'Ein Fehler ist aufgetreten'
  },
  zh: {
    nameLabel: '姓名',
    emailLabel: '电子邮件',
    submitText: '提交',
    submittingText: '提交中...',
    errorMessage: '发生错误'
  },
  ja: {
    nameLabel: '名前',
    emailLabel: 'メールアドレス',
    submitText: '送信',
    submittingText: '送信中...',
    errorMessage: 'エラーが発生しました'
  },
  ko: {
    nameLabel: '이름',
    emailLabel: '이메일',
    submitText: '제출',
    submittingText: '제출 중...',
    errorMessage: '오류가 발생했습니다'
  }
}

const getBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en'

  const browserLang = window.navigator.language.split('-')[0]
  return Object.keys(formTexts).indexOf(browserLang) !== -1
    ? (browserLang as Language)
    : 'en'
}

interface BetaFormProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
  fieldClassName?: string
  language?: Language
  customTexts?: Partial<FormText>
  components?: {
    Message?: React.ComponentType<FormMessageProps>
    Button?: React.ComponentType<FormButtonProps>
  }
  autoFocus?: boolean
  showSuccessMessage?: boolean
  successMessageDuration?: number
}

// Animation styles
const alertBoxClass =
  'inline-flex flex-col items-center justify-center px-6 py-6 rounded-lg shadow-2xl bg-white border animate-fade-in-scale max-w-[90vw] sm:max-w-md'

// Add animation keyframes (inject into document head if not present)
if (
  typeof window !== 'undefined' &&
  !document.getElementById('fade-in-scale-keyframes')
) {
  const style = document.createElement('style')
  style.id = 'fade-in-scale-keyframes'
  style.innerHTML = `
    @keyframes fade-in-scale {
      0% { opacity: 0; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in-scale {
      animation: fade-in-scale 0.5s cubic-bezier(0.4,0,0.2,1);
    }
  `
  document.head.appendChild(style)
}

export const BetaForm: React.FC<BetaFormProps> = ({
  onSuccess,
  onError,
  className = '',
  fieldClassName = 'mb-4',
  language: propLanguage,
  customTexts = {},
  components: customComponents,
  autoFocus = true,
  showSuccessMessage = true
}) => {
  const [detectedLanguage, setDetectedLanguage] = useState<Language>('en')
  const [showSuccess, setShowSuccess] = useState(false)
  const [formHidden, setFormHidden] = useState(false)
  const {
    submitBetaForm,
    isLoading,
    isSubmitting,
    error,
    config: betaFormConfig,
    success,
    message
  } = useBetaForm()
  const { components: contextComponents } = useSaaSOS()

  useEffect(() => {
    setDetectedLanguage(getBrowserLanguage())
  }, [])

  useEffect(() => {
    if (success && showSuccessMessage) {
      setShowSuccess(true)
      setFormHidden(true)
    }
    if (error) {
      setFormHidden(true)
    }
    return undefined
  }, [success, showSuccessMessage, error])

  const language = propLanguage || detectedLanguage
  const texts = {
    ...formTexts[language],
    ...customTexts
  }

  const components = {
    Message: customComponents?.Message || contextComponents.Message,
    Button: customComponents?.Button || contextComponents.Button
  }

  const form = useForm<BetaFormValues>({
    resolver: zodResolver(betaFormSchema),
    defaultValues: { email: '', name: '' },
    mode: 'onChange',
    reValidateMode: 'onChange'
  })

  // Set focus on name field when component mounts
  useEffect(() => {
    if (autoFocus) {
      form.setFocus('name')
    }
    return undefined
  }, [autoFocus, form])

  const onSubmit = async (data: BetaFormValues) => {
    try {
      const response = await submitBetaForm(data)
      if (response.success) {
        onSuccess?.()
        form.reset()
        if (showSuccessMessage) {
          setShowSuccess(true)
        }
        setFormHidden(true)
      } else {
        onError?.(response.message)
        setFormHidden(true)
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : texts.errorMessage)
      setFormHidden(true)
    }
  }

  const handleRetry = () => {
    setFormHidden(false)
    form.reset()
  }

  const isFormValid = form.formState.isValid && !isSubmitting
  const hasErrors = Object.keys(form.formState.errors).length > 0

  return (
    <div>
      {isLoading ? (
        <div className='flex flex-col items-center justify-center w-full space-y-4 px-8 sm:px-16 py-8 sm:py-16 gap-y-2'>
          {/* Logo skeleton */}
          <Skeleton className='h-24 w-24 rounded-lg' />
          {/* Name skeleton */}
          <Skeleton className='h-6 w-32' />
          {/* Form fields skeleton */}
          <div className='w-full space-y-4'>
            <div className='space-y-2'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-10 w-full' />
            </div>
            <div className='space-y-2'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-10 w-full' />
            </div>
            <Skeleton className='h-10 w-full' />
          </div>
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center w-full px-8 sm:px-16 py-8 sm:py-16'>
          <div className='flex flex-col items-center justify-center w-full'>
            {betaFormConfig?.logo && <Logo logo={betaFormConfig?.logo} />}
            <div>{betaFormConfig?.name}</div>
          </div>
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={className}
              noValidate
              aria-busy={isSubmitting}
            >
              {!formHidden && (
                <>
                  {betaFormConfig?.screen?.register && (
                    <Screen screen={betaFormConfig?.screen?.register} />
                  )}
                  <FormField name='name'>
                    <FormItem className={fieldClassName}>
                      <FormLabel required>{texts.nameLabel}</FormLabel>
                      <FormControl />
                      <FormMessage>
                        {form.formState.errors.name?.message}
                      </FormMessage>
                    </FormItem>
                  </FormField>

                  <FormField name='email'>
                    <FormItem className={fieldClassName}>
                      <FormLabel required>{texts.emailLabel}</FormLabel>
                      <FormControl />
                      <FormMessage>
                        {form.formState.errors.email?.message}
                      </FormMessage>
                    </FormItem>
                  </FormField>

                  <FormField name='submit'>
                    <FormItem className={fieldClassName}>
                      <components.Button
                        type='submit'
                        disabled={!isFormValid}
                        className={fieldClassName}
                        aria-busy={isSubmitting}
                        aria-disabled={!isFormValid}
                        aria-invalid={hasErrors}
                      >
                        {isSubmitting ? texts.submittingText : texts.submitText}
                      </components.Button>
                    </FormItem>
                  </FormField>
                </>
              )}
              {formHidden && error && (
                <div className='flex flex-col items-center justify-center w-full'>
                  <components.Message
                    type='error'
                    className={cn(
                      alertBoxClass.replace('border', ''),
                      'border-red-300',
                      'text-red-700'
                    )}
                    role='alert'
                    aria-live='assertive'
                    aria-atomic={true}
                  >
                    <span
                      className='text-4xl mb-2'
                      role='img'
                      aria-label='Error'
                    >
                      ❗
                    </span>
                    {error}
                  </components.Message>
                  <div className='mt-4 flex justify-center'>
                    <components.Button
                      type='button'
                      onClick={handleRetry}
                      className={fieldClassName}
                    >
                      Try Again
                    </components.Button>
                  </div>
                </div>
              )}
              {formHidden && showSuccess && message && (
                <div className='flex flex-col items-center justify-center w-full'>
                  <components.Message
                    type='success'
                    className={cn(
                      alertBoxClass.replace('border', ''),
                      'text-green-700',
                      'border-green-300',
                      'text-center'
                    )}
                    role='status'
                    aria-live='polite'
                    aria-atomic={true}
                  >
                    <span
                      style={{
                        fontSize: '64px',
                        marginBottom: '16px'
                      }}
                    >
                      ✅
                    </span>
                    {betaFormConfig?.screen?.thankYou && (
                      <Screen screen={betaFormConfig?.screen?.thankYou} />
                    )}
                  </components.Message>
                </div>
              )}
            </form>
          </FormProvider>
          {!formHidden && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem',
                borderTop: '1px solid #e5e7eb'
              }}
            >
              {/* privacy notice*/}
              <div
                style={{
                  fontSize: '0.875rem',
                  textAlign: 'center'
                }}
              >
                By submitting this form, you consent to our{' '}
                <a
                  href={betaFormConfig?.privacyPolicy}
                  target='_blank'
                  rel='noopener noreferrer'
                  style={{
                    color: '#1e40af',
                    textDecoration: 'underline',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#1e3a8a')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#1e40af')}
                >
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a
                  href={betaFormConfig?.termsOfService}
                  target='_blank'
                  rel='noopener noreferrer'
                  style={{
                    color: '#1e40af',
                    textDecoration: 'underline',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#1e3a8a')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#1e40af')}
                >
                  Terms of Service
                </a>
                .
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Screen({ screen }: { screen: IBetaConfig['screen']['register'] }) {
  return (
    <div className='flex flex-col items-center justify-center w-full'>
      <p
        style={{
          fontSize: '24px'
        }}
      >
        {screen?.title}
      </p>
      <p
        style={{
          fontSize: '16px',
          color: '#666'
        }}
      >
        {screen?.description}
      </p>
    </div>
  )
}

function Logo({ logo }: { logo: IBetaConfig['logo'] }) {
  if (typeof logo === 'string') {
    return (
      <img
        src={logo}
        alt='Logo'
        style={{
          maxHeight: '100px'
        }}
      />
    )
  }
  return (
    <img src={logo.bucket?.url} alt='Logo' style={{ maxHeight: '100px' }} />
  )
}
