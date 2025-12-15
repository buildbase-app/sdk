import { useCallback, useEffect, useState } from 'react';
import { IBetaConfig } from '../../api';
import { useAppSelector } from '../../contexts';
import { BetaForm } from './api';
import { BetaFormData, BetaFormResponse } from './types';

export const useBetaForm = () => {
  const osState = useAppSelector(state => state.os);

  const [config, setConfig] = useState<IBetaConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      const betaForm = new BetaForm(osState);
      const config = await betaForm.fetchConfig();
      setConfig(config);
      setIsLoading(false);
    };
    fetchConfig();
  }, [osState]);

  const submitBetaForm = useCallback(
    async (data: BetaFormData): Promise<BetaFormResponse> => {
      if (!osState) {
        const errorMessage = 'SaaS OS context is not initialized';
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
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit beta form';
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
