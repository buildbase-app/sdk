import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Smile } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getCurrencyFlag } from '../../../api/billing/currency-utils';
import { Button } from '../../../components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { StatusBanner } from '../../../components/ui/status-banner';
import { usePermissions } from '../../../hooks/usePermissions';
import { useSuccessMessage } from '../../../hooks/useSuccessMessage';
import { useTranslation } from '../../../i18n';
import { handleError } from '../../../lib/error-handler';
import { Permission } from '../../../lib/permissions';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import NoPermission from './NoPermission';
import SettingSkeleton from './Skeleton';
import { getSvgImage, workspaceEmojis } from './utils';

const WorkspaceSettingsGeneral: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const { t } = useTranslation();
  const { updateWorkspace } = useSaaSWorkspaces();
  const { can } = usePermissions();
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageType, setImageType] = useState<'emoji' | 'url'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState<string>();
  const success = useSuccessMessage();

  const formSchema = z.object({
    name: z.string().min(2, {
      message: t('general.nameMinLength'),
    }),
    image: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: workspace.name || '',
      image: workspace.image || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsUpdating(true);
    success.clear();
    try {
      await updateWorkspace(workspace, values);
      success.show(t('general.success'));
    } catch (error) {
      handleError(error, {
        component: 'WorkspaceSettingsGeneral',
        action: 'updateWorkspace',
        metadata: { workspaceId: workspace._id },
      });
    } finally {
      setIsUpdating(false);
    }
  }
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    form.setValue('image', getSvgImage(emoji));
  };

  if (!workspace) {
    return <SettingSkeleton />;
  }

  const canEdit = can(Permission.WORKSPACE_SETTINGS_EDIT);

  return (
    <div>
      {success.message && (
        <StatusBanner
          variant="success"
          title={t('settings.common.success')}
          message={success.message}
          className="mb-4"
        />
      )}
      {!canEdit && <NoPermission descriptionKey="general.ownerOnly" />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('general.name')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('general.namePlaceholder')}
                    {...field}
                    disabled={!canEdit}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {workspace.billingCurrency?.trim() && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">
                {t('general.billingCurrency')}
              </Label>
              <div className="flex items-center gap-2 text-sm">
                {getCurrencyFlag(workspace.billingCurrency) && (
                  <span className="text-base">{getCurrencyFlag(workspace.billingCurrency)}</span>
                )}
                <span>{workspace.billingCurrency.trim().toUpperCase()}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{t('general.icon')}</Label>
              <FormDescription>{t('general.iconDescription')}</FormDescription>
            </div>

            <RadioGroup
              value={imageType}
              disabled={!canEdit}
              onValueChange={value => setImageType(value as 'emoji' | 'url')}
              className="flex flex-col space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="emoji" id="emoji" />
                <Label htmlFor="emoji" className="flex items-center gap-2">
                  <Smile className="h-4 w-4" />
                  {t('general.chooseEmoji')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="url" />
                <Label htmlFor="url" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {t('general.customImageUrl')}
                </Label>
              </div>
            </RadioGroup>

            {imageType === 'emoji' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{t('general.previewLabel')}</span>
                  <div className="w-12 h-12 rounded-lg border-2 border-border flex items-center justify-center text-2xl bg-muted">
                    {selectedEmoji && <span className="text-2xl">{selectedEmoji}</span>}
                    {!selectedEmoji && form.watch('image')?.trim() && (
                      <img src={form.watch('image') || undefined} alt="Workspace preview" />
                    )}
                  </div>
                </div>
                {canEdit && (
                  <ScrollArea className="h-32 w-full rounded-md border">
                    <div className="p-4 grid grid-cols-8 gap-2">
                      {workspaceEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleEmojiSelect(emoji)}
                          disabled={!canEdit}
                          aria-label={emoji}
                          aria-pressed={selectedEmoji === emoji}
                          className={`w-8 h-8 rounded flex items-center justify-center text-lg hover:bg-muted transition-colors ${
                            selectedEmoji === emoji ? 'bg-primary text-primary-foreground' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {imageType === 'url' && (
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('general.imageUrl')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('general.imageUrlPlaceholder')}
                          {...field}
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>{t('general.imageUrlDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('image') && form.watch('image')?.trim() && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{t('general.previewLabel')}</span>
                    <div className="w-12 h-12 rounded-lg border-2 border-border overflow-hidden bg-muted">
                      <img
                        src={form.watch('image') || undefined}
                        className="w-full h-full object-cover"
                        alt="Workspace preview"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {canEdit && (
              <Button type="submit" disabled={isUpdating} progress={isUpdating}>
                {t('general.updateWorkspace')}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default WorkspaceSettingsGeneral;
