import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { IUser } from '../../../api/types';
import { SelectCountry } from '../../../components/dropdowns/country/selectCountry';
import { SelectCurrency } from '../../../components/dropdowns/currency/selectCurrency';
import { SelectLanguage } from '../../../components/dropdowns/language/selectLanguage';
import { SelectTimeZone } from '../../../components/dropdowns/timezone/selectTimeZone';
import { Button } from '../../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { useSuccessMessage } from '../../../hooks/useSuccessMessage';
import { useTranslation } from '../../../i18n';
import { handleError } from '../../../lib/error-handler';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsProfile: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const { t } = useTranslation();
  const { updateUserProfile, getProfile } = useSaaSWorkspaces();
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<IUser>();
  const [reloadCounter, setReloadCounter] = useState(0);
  const success = useSuccessMessage();

  const formSchema = z.object({
    name: z.string().min(2, {
      message: t('profile.nameMinLength'),
    }),
    country: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    currency: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      country: user?.country || '',
      timezone: user?.timezone || '',
      language: user?.language || '',
      currency: user?.currency || '',
    },
  });

  useEffect(() => {
    getProfile().then((user: IUser) => {
      setUser(user);
      form.setValue('name', user.name);
      form.setValue('country', user.country);
      form.setValue('timezone', user.timezone);
      form.setValue('language', user.language);
      form.setValue('currency', user.currency);
    });
  }, [reloadCounter]);

  function reloadProfile() {
    setReloadCounter(prev => prev + 1);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    success.clear();
    try {
      await updateUserProfile({
        name: values.name,
        country: values.country,
        timezone: values.timezone,
        language: values.language,
        currency: values.currency,
      });
      success.show(t('profile.success'));
    } catch (error) {
      handleError(error, {
        component: 'WorkspaceSettingsProfile',
        action: 'updateUserProfile',
        metadata: { workspaceId: workspace._id },
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) {
    return <SettingSkeleton />;
  }

  return (
    <div>
      {success.message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">{t('settings.common.success')}</p>
          <p className="text-sm">{success.message}</p>
        </div>
      )}
      <div className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('profile.email')}</label>
              <Input
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100"
                value={user?.email}
              />
            </div>
            <FormField
              disabled={isSaving}
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-y-2 my-4 flex-col">
              <div className="flex flex-col gap-0.5">
                <div className="text-sm font-medium">{t('profile.language')}</div>
                <SelectLanguage
                  value={form.watch('language')}
                  onChange={newValue => {
                    form.setValue('language', newValue);
                  }}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-sm font-medium">{t('profile.country')}</div>
                <SelectCountry
                  value={form.watch('country')}
                  onChange={newValue => {
                    form.setValue('country', newValue);
                  }}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-sm font-medium">{t('profile.currency')}</div>
                <SelectCurrency
                  value={form.watch('currency')}
                  onChange={newValue => {
                    form.setValue('currency', newValue);
                  }}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-sm font-medium">{t('profile.timezone')}</div>
                <SelectTimeZone
                  value={form.watch('timezone')}
                  onChange={newValue => {
                    form.setValue('timezone', newValue);
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-x-2">
              <Button type="submit" progress={isSaving} disabled={isSaving}>
                {t('profile.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reloadProfile();
                }}
                disabled={isSaving}
              >
                {t('profile.reset')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      {user?.image && (
        <div>
          <label className="block text-sm font-medium mb-1">{t('profile.profileImage')}</label>
          <div className="w-16 h-16 rounded-full overflow-hidden">
            <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettingsProfile;
