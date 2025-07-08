import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import { IBetaConfig } from './api';
import { useBetaForm } from './hooks';
import { formSchema, formValuesType } from './schema';

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko';

interface FormText {
  nameLabel: string;
  emailLabel: string;
  submitText: string;
  submittingText: string;
  errorMessage: string;
}

const formTexts: Record<Language, FormText> = {
  en: {
    nameLabel: 'Name',
    emailLabel: 'Email',
    submitText: 'Submit',
    submittingText: 'Submitting...',
    errorMessage: 'An error occurred',
  },
  es: {
    nameLabel: 'Nombre',
    emailLabel: 'Correo electrónico',
    submitText: 'Enviar',
    submittingText: 'Enviando...',
    errorMessage: 'Ocurrió un error',
  },
  fr: {
    nameLabel: 'Nom',
    emailLabel: 'Email',
    submitText: 'Soumettre',
    submittingText: 'Soumission...',
    errorMessage: 'Une erreur est survenue',
  },
  de: {
    nameLabel: 'Name',
    emailLabel: 'E-Mail',
    submitText: 'Absenden',
    submittingText: 'Wird gesendet...',
    errorMessage: 'Ein Fehler ist aufgetreten',
  },
  zh: {
    nameLabel: '姓名',
    emailLabel: '电子邮件',
    submitText: '提交',
    submittingText: '提交中...',
    errorMessage: '发生错误',
  },
  ja: {
    nameLabel: '名前',
    emailLabel: 'メールアドレス',
    submitText: '送信',
    submittingText: '送信中...',
    errorMessage: 'エラーが発生しました',
  },
  ko: {
    nameLabel: '이름',
    emailLabel: '이메일',
    submitText: '제출',
    submittingText: '제출 중...',
    errorMessage: '오류가 발생했습니다',
  },
};

const getBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';

  const browserLang = window.navigator.language.split('-')[0];
  return Object.keys(formTexts).indexOf(browserLang) !== -1 ? (browserLang as Language) : 'en';
};

interface BetaFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  fieldClassName?: string;
  language?: Language;
  customTexts?: Partial<FormText>;
  autoFocus?: boolean;
  showSuccessMessage?: boolean;
  successMessageDuration?: number;
  hideLogo?: boolean;
  hideTitles?: boolean;
}

export const BetaForm: React.FC<BetaFormProps> = ({
  onSuccess,
  onError,
  className = 'w-full',
  fieldClassName = 'flex flex-col gap-1.5 w-full',
  language: propLanguage,
  customTexts = {},
  autoFocus = true,
  showSuccessMessage = true,
  hideLogo = false,
  hideTitles = false,
}) => {
  const [detectedLanguage, setDetectedLanguage] = useState<Language>('en');
  const [showSuccess, setShowSuccess] = useState(false);
  const [formHidden, setFormHidden] = useState(false);
  const {
    submitBetaForm,
    isLoading,
    isSubmitting,
    error,
    config: betaFormConfig,
    success,
    message,
  } = useBetaForm();

  useEffect(() => {
    setDetectedLanguage(getBrowserLanguage());
  }, []);

  useEffect(() => {
    if (success && showSuccessMessage) {
      setShowSuccess(true);
      setFormHidden(true);
    }
    if (error) {
      setFormHidden(true);
    }
    return undefined;
  }, [success, showSuccessMessage, error]);

  const language = propLanguage || detectedLanguage;
  const texts = {
    ...formTexts[language],
    ...customTexts,
  };

  const form = useForm<formValuesType>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', name: '' },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  // Set focus on name field when component mounts
  useEffect(() => {
    if (autoFocus) {
      form.setFocus('name');
    }
    return undefined;
  }, [autoFocus, form]);

  const onSubmit = async (data: formValuesType) => {
    try {
      const response = await submitBetaForm(data);
      if (response.success) {
        onSuccess?.();
        form.reset();
        if (showSuccessMessage) {
          setShowSuccess(true);
        }
        setFormHidden(true);
      } else {
        onError?.(response.message);
        setFormHidden(true);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : texts.errorMessage);
      setFormHidden(true);
    }
  };

  const handleRetry = () => {
    setFormHidden(false);
    form.reset();
  };

  const isFormValid = form.formState.isValid && !isSubmitting;
  return (
    <div
      className="saas-os-ui"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isLoading ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center w-full px-2.5 sm:px-6 py-2.5 sm:py-6 gap-y-2.5 sm:gap-y-4',
            className
          )}
        >
          {/* Logo skeleton */}
          <Skeleton className="h-24 w-24 rounded-lg" />
          {/* Name skeleton */}
          <Skeleton className="h-6 w-32" />
          {/* Form fields skeleton */}
          <div className="w-full space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full px-2.5 sm:px-6 py-2.5 sm:py-6 gap-y-2.5 sm:gap-y-4">
          {!hideLogo && (
            <div className="flex flex-col items-center justify-center w-full">
              {betaFormConfig?.logo && <Logo logo={betaFormConfig?.logo} />}
              {betaFormConfig?.name && <div>{betaFormConfig?.name}</div>}
            </div>
          )}
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={className}
              noValidate
              aria-busy={isSubmitting}
            >
              {!formHidden && (
                <>
                  {!hideTitles && betaFormConfig?.screen?.register && (
                    <Screen screen={betaFormConfig?.screen?.register} />
                  )}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }: { field: any }) => (
                      <FormItem className={fieldClassName}>
                        <FormLabel>{texts.nameLabel}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }: { field: any }) => (
                      <FormItem className={fieldClassName}>
                        <FormLabel>{texts.emailLabel}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={!isFormValid} className={fieldClassName}>
                    {isSubmitting ? texts.submittingText : texts.submitText}
                  </Button>
                </>
              )}
              {formHidden && error && (
                <div className="flex flex-col items-center justify-center w-full">
                  <div
                    className="border-red-300 text-red-700"
                    role="alert"
                    aria-live="assertive"
                    aria-atomic={true}
                  >
                    <span className="text-4xl mb-2" role="img" aria-label="Error">
                      ❗
                    </span>
                    {error}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button type="button" onClick={handleRetry} className={fieldClassName}>
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
              {formHidden && showSuccess && message && (
                <div className="flex flex-col items-center justify-center w-full text-green-700 border-green-300 text-center">
                  {betaFormConfig?.screen?.thankYou && (
                    <Screen screen={betaFormConfig?.screen?.thankYou} />
                  )}
                </div>
              )}
            </form>
          </FormProvider>
          {!formHidden && (
            <div>
              {/* privacy notice*/}
              <div>
                By submitting this form, you consent to our{' '}
                <a
                  href={betaFormConfig?.privacyPolicy}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a
                  href={betaFormConfig?.termsOfService}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
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
  );
};

function Screen({ screen }: { screen: IBetaConfig['screen']['register'] }) {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      <p className="text-2xl font-bold">{screen?.title}</p>
      <p className="text-sm text-muted-foreground">{screen?.description}</p>
    </div>
  );
}

function Logo({ logo }: { logo: IBetaConfig['logo'] }) {
  if (typeof logo === 'string') {
    return <img src={logo} alt="Logo" className="max-h-24" />;
  }
  return <img src={logo.bucket?.url} alt="Logo" className="max-h-24" />;
}
