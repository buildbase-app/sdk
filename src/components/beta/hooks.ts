import { useCallback, useEffect, useState } from 'react';
import type { IBetaConfig } from '../../api/services/beta-api';
import { useTranslation } from '../../i18n';
import { useSaaSOs } from '../../providers/os/hooks';
import { BetaForm } from './api';
import { BetaFormData, BetaFormResponse } from './types';

export const useBetaForm = () => {
  const { t } = useTranslation();
  const osState = useSaaSOs();

  const [config, setConfig] = useState<IBetaConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchConfig = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const betaForm = new BetaForm(osState);
        const result = await betaForm.fetchConfig();
        if (!cancelled) {
          setConfig(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('beta.errorMessage'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    fetchConfig();
    return () => {
      cancelled = true;
    };
  }, [osState]);

  const submitBetaForm = useCallback(
    async (data: BetaFormData): Promise<BetaFormResponse> => {
      if (!osState) {
        const errorMessage = t('errors.generic');
        setError(errorMessage);
        return {
          success: false,
          message: errorMessage,
        };
      }

      try {
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);
        setMessage(null);

        const betaForm = new BetaForm(osState);
        const response = await betaForm.submitBetaUser({
          name: data.name || '',
          email: data.email,
        });

        const isSuccess = response.status === 'success';
        setSuccess(isSuccess);
        setMessage(response.message);

        return {
          success: isSuccess,
          message: response.message,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('beta.errorMessage');
        setError(errorMessage);
        setSuccess(false);
        setMessage(errorMessage);
        return {
          success: false,
          message: errorMessage,
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [osState]
  );

  return {
    isLoading,
    isSubmitting,
    config,
    error,
    success,
    message,
    submitBetaForm,
  };
};
