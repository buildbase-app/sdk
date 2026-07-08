import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Image, Loader2, Plus, RefreshCcw, Search, Smile, Users } from 'lucide-react';
import { lazy, ReactNode, Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { useUIVisibility } from '../../hooks/useUIVisibility';
import { useTranslation } from '../../i18n';
import { handleError } from '../../lib/error-handler';
import { cn } from '../../lib/utils';
import { useSaaSAuth } from '../auth/hooks';
import { useSaaSOs, useSaaSSettings } from '../os/hooks';
import { isOsConfigReady } from '../os/types';
import { useSaaSWorkspaces } from './hooks';
import type { IWorkspace } from './types';
import { getSvgImage, workspaceEmojis } from './ui/utils';
// Lazy-loaded so the 12 settings screens stay out of the main bundle
const WorkspaceSettingsDialog = lazy(() =>
  import('./ui/SettingsDialog').then(m => ({ default: m.default }))
);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export function WorkspaceSwitcher(props: {
  trigger: (isLoading: boolean, currentWorkspace: IWorkspace | null) => ReactNode;
}) {
  const { t, dir } = useTranslation();
  const { isAuthenticated, user } = useSaaSAuth();
  const os = useSaaSOs();
  const isConfigReady = isOsConfigReady(os);
  const {
    workspaces,
    currentWorkspace,
    loading,
    refreshing,
    switchingToId,
    fetchWorkspaces,
    getFeatures,
    refreshWorkspaces,
    setCurrentWorkspace,
    switchToWorkspace,
  } = useSaaSWorkspaces();
  const { settings } = useSaaSSettings();
  const { visible } = useUIVisibility();
  const [open, setOpen] = useState(false);
  const [reloadWorkspacesCount, setReloadWorkspacesCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Combine loading and refreshing states for trigger
  const isLoading = loading || refreshing;

  // Fetch workspaces and features only after SDK (OS config) is loaded and user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !isConfigReady) return;
    // Only fetch if workspaces are empty (not already loaded)
    if (workspaces.length === 0) {
      fetchWorkspaces();
      getFeatures();
    } else {
      // If workspaces are already loaded, just ensure features are loaded
      getFeatures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isConfigReady]); // Run when auth or config becomes ready

  // Refresh workspaces when reloadWorkspacesCount changes (but don't fetch features again)
  useEffect(() => {
    if (!isAuthenticated || !isConfigReady) return;
    if (reloadWorkspacesCount > 0) {
      refreshWorkspaces();
      // Don't call getFeatures here - features don't need to be refreshed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadWorkspacesCount, isAuthenticated, isConfigReady]); // Only refresh workspaces, not features

  function reloadWorkspaces() {
    if (!isAuthenticated || !isConfigReady) return;
    setReloadWorkspacesCount(prev => prev + 1);
  }

  const workspacesToUse = workspaces;

  // Filter workspaces based on search query
  const filteredWorkspaces = workspacesToUse
    .filter(workspace => workspace._id !== currentWorkspace?._id)
    .filter(workspace => workspace.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Workspace mode settings — server settings ANDed with the implementor UI config
  const canCreate =
    (settings?.workspace?.canCreateWorkspace ?? true) &&
    visible(ui => ui.workspaceSwitcher?.createButton);
  const showSwitcher =
    (settings?.workspace?.showSwitcher ?? true) && visible(ui => ui.workspaceSwitcher?.show);
  const maxPerUser = settings?.workspace?.maxWorkspacesPerUser ?? 0; // 0 = unlimited

  const myWorkspacesCount =
    workspacesToUse?.filter(workspace => {
      const createdBy =
        typeof workspace.createdBy === 'object'
          ? workspace.createdBy._id?.toString()
          : workspace.createdBy?.toString();
      return createdBy === user?.id?.toString();
    }).length ?? 0;

  const allowedToCreateWorkspace =
    canCreate !== false && (maxPerUser === 0 || myWorkspacesCount < maxPerUser);

  // In single-workspace modes (showSwitcher: false), auto-select the only workspace
  useEffect(() => {
    if (!showSwitcher && workspaces.length > 0 && !currentWorkspace) {
      switchToWorkspace(workspaces[0]).catch(err => {
        handleError(err, { component: 'WorkspaceProvider', action: 'autoSelectWorkspace' });
      });
    }
  }, [showSwitcher, workspaces, currentWorkspace]);

  // In personal mode (no switcher), clicking the trigger opens workspace settings directly
  if (!showSwitcher && currentWorkspace) {
    return (
      <>
        <div onClick={() => setOpen(true)}>{props.trigger?.(isLoading, currentWorkspace)}</div>
        <Suspense fallback={null}>
          <WorkspaceSettingsDialog
            workspace={currentWorkspace}
            open={open}
            onOpenChange={setOpen}
            showTrigger={false}
          />
        </Suspense>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{props.trigger?.(isLoading, currentWorkspace)}</DialogTrigger>
      {/* Dialog Content */}
      <DialogContent dir={dir} className="max-w-2xl min-w-full md:min-w-[800px]">
        <DialogHeader dir={dir}>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('workspace.switchTitle')}
          </DialogTitle>
          <DialogDescription>{t('workspace.switchDescription')}</DialogDescription>
        </DialogHeader>
        {!user && (
          <div className="flex flex-col items-center justify-center h-full py-4 sm:py-8">
            <div className="text-sm font-medium text-muted-foreground">
              {t('workspace.notLoggedIn')}
            </div>
          </div>
        )}
        {user && (
          <div dir={dir} className="flex flex-col gap-4">
            {/* Current Workspace */}
            {currentWorkspace && (
              <WorkspaceItem
                workspace={currentWorkspace}
                isCurrentWorkspace={true}
                switchToWorkspace={switchToWorkspace}
                switchingToId={switchingToId}
                onClose={() => setOpen(false)}
                setCurrentWorkspace={setCurrentWorkspace}
                setOpen={setOpen}
                workspacesToUse={workspacesToUse}
              />
            )}

            <Separator />

            {/* Workspaces List */}
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                  {t('workspace.availableWorkspaces', { count: filteredWorkspaces.length })}
                </div>
                <div>
                  <Button
                    progress={refreshing}
                    disabled={refreshing}
                    variant="ghost"
                    onClick={reloadWorkspaces}
                    startIcon={<RefreshCcw />}
                  >
                    {t('settings.common.refreshAction', { loading: String(refreshing) })}
                  </Button>
                </div>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t('workspace.searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="ps-10"
                />
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ms-2 text-sm text-muted-foreground">
                    {t('workspace.loadingWorkspaces')}
                  </span>
                </div>
              ) : filteredWorkspaces.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchQuery
                      ? t('workspace.noWorkspacesFound')
                      : t('workspace.noWorkspacesAvailable')}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-64" dir={dir}>
                  <div dir={dir} className="flex flex-col gap-2 my-2.5">
                    {filteredWorkspaces.map(workspace => {
                      const isCurrentWorkspace = workspace._id === currentWorkspace?._id;
                      return (
                        <WorkspaceItem
                          key={workspace._id}
                          workspace={workspace}
                          isCurrentWorkspace={isCurrentWorkspace}
                          switchToWorkspace={switchToWorkspace}
                          switchingToId={switchingToId}
                          onClose={() => setOpen(false)}
                          setCurrentWorkspace={setCurrentWorkspace}
                          setOpen={setOpen}
                          workspacesToUse={workspacesToUse}
                        />
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {allowedToCreateWorkspace && (
              <>
                <Separator />
                <CreateWorkspaceDialog
                  onCreated={() => {
                    fetchWorkspaces();
                  }}
                />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface WorkspaceItemProps {
  workspace: IWorkspace;
  isCurrentWorkspace?: boolean;
  switchToWorkspace: (workspace: IWorkspace) => Promise<void>;
  switchingToId: string | null;
  onClose: () => void;
  setCurrentWorkspace: (workspace: IWorkspace) => void;
  setOpen: (open: boolean) => void;
  workspacesToUse: IWorkspace[];
}

function WorkspaceItem(props: WorkspaceItemProps) {
  const { t } = useTranslation();
  const { visible } = useUIVisibility();
  const showMemberCount = visible(ui => ui.workspaceSwitcher?.memberCount);
  const showPlanBadge = visible(ui => ui.workspaceSwitcher?.planBadge);
  const { workspace, setCurrentWorkspace, setOpen, workspacesToUse, switchingToId } = props;
  const isCurrentWorkspace = props.isCurrentWorkspace ?? false;
  const isSwitchingThis = switchingToId === workspace._id;

  const getWorkspaceInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  const subscription = workspace.subscription ?? null;
  const plan =
    subscription != null && typeof subscription === 'object' ? (subscription.plan ?? null) : null;
  const planName = plan?.name ?? '';
  return (
    <div
      className={cn('flex items-center gap-3 rounded-lg border-2 p-3 border-border', {
        'bg-muted text-muted-foreground': isCurrentWorkspace,
      })}
    >
      <Avatar className="h-8 w-8 flex items-center justify-center">
        <div>
          <AvatarImage
            src={workspace.image && workspace.image.trim() ? workspace.image : undefined}
          />
        </div>
        <AvatarFallback>{getWorkspaceInitials(workspace.name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 max-w-full">
        <div className="flex items-center gap-2">
          <span className="font-medium line-clamp-1 text-ellipsis overflow-hidden max-w-full">
            {workspace.name}
          </span>
        </div>
        {showMemberCount && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{t('workspace.membersCount', { count: workspace.users?.length || 0 })}</span>
          </div>
        )}
        {showPlanBadge && planName && (
          <div className="max-w-fit">
            <div className="flex items-center gap-1 text-sm bg-success text-success-foreground rounded-full px-2 py-0.5">
              <span className="text-xs">{planName}</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isCurrentWorkspace ? null : (
          <Button
            size="sm"
            disabled={switchingToId !== null || isSwitchingThis}
            progress={isSwitchingThis}
            onClick={() => {
              props
                .switchToWorkspace(workspace)
                .then(() => setOpen(false))
                .catch(error => {
                  handleError(error, {
                    component: 'WorkspaceItem',
                    action: 'switchToWorkspace',
                    metadata: { workspaceId: workspace._id },
                  });
                });
            }}
          >
            {t('workspace.switchTo')}
          </Button>
        )}
        <Suspense fallback={null}>
          <WorkspaceSettingsDialog
            workspace={workspace}
            onClose={() => {
              if (isCurrentWorkspace) {
                const index = workspacesToUse.findIndex(
                  w => w._id?.toString() === workspace._id?.toString()
                );
                if (index !== -1) {
                  setCurrentWorkspace(workspacesToUse[index]);
                }
              }
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

function CreateWorkspaceDialog(props: { onCreated: () => void }) {
  const { t, dir } = useTranslation();
  const { switching } = useSaaSWorkspaces();
  const [open, setOpen] = useState(false);
  const [imageType, setImageType] = useState<'emoji' | 'url'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🏢');
  const [isCreating, setIsCreating] = useState(false);
  const { createWorkspace } = useSaaSWorkspaces();

  const formSchema = z.object({
    name: z.string().min(2, {
      message: t('workspace.workspaceNameMinLength'),
    }),
    image: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      image: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let imageUrl = '';

    if (imageType === 'emoji') {
      // update this to make sure emojis is in center of the image
      imageUrl = getSvgImage(selectedEmoji);
    } else if (imageType === 'url' && values.image) {
      try {
        new URL(values.image);
        imageUrl = values.image;
      } catch {
        form.setError('image', { message: t('workspace.invalidUrl') });
        return;
      }
    }

    setIsCreating(true);
    try {
      await createWorkspace(values.name, imageUrl);
      setOpen(false);
      form.reset();
      setSelectedEmoji('🏢');
      setImageType('emoji');
      props?.onCreated?.();
    } catch (error) {
      handleError(error, {
        component: 'WorkspaceProvider',
        action: 'createWorkspace',
        metadata: { name: values.name },
      });
    } finally {
      setIsCreating(false);
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    form.setValue('image', getSvgImage(emoji));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full rounded-none" disabled={switching}>
          <Plus className="h-4 w-4 me-2" />
          {t('workspace.createNew')}
        </Button>
      </DialogTrigger>
      <DialogContent dir={dir} className="max-w-xl min-w-full sm:min-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('workspace.createTitle')}</DialogTitle>
          <DialogDescription>{t('workspace.createDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('workspace.workspaceName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('workspace.workspaceNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-y-2 my-2">
              <div>
                <Label className="text-sm font-medium">{t('workspace.workspaceIcon')}</Label>
                <FormDescription>{t('workspace.iconDescription')}</FormDescription>
              </div>

              <RadioGroup
                value={imageType}
                onValueChange={value => setImageType(value as 'emoji' | 'url')}
                className="flex flex-col gap-y-2"
              >
                <div className="flex items-center gap-x-2 my-1">
                  <RadioGroupItem value="emoji" id="emoji" />
                  <Label htmlFor="emoji" className="flex items-center gap-2">
                    <Smile className="h-4 w-4" />
                    {t('workspace.chooseEmoji')}
                  </Label>
                </div>
                <div className="flex items-center gap-x-2 my-1">
                  <RadioGroupItem value="url" id="url" />
                  <Label htmlFor="url" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    {t('workspace.customImageUrl')}
                  </Label>
                </div>
              </RadioGroup>

              {imageType === 'emoji' && (
                <div className="flex flex-col gap-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{t('general.previewLabel')}</span>
                    <div className="w-12 h-12 rounded-lg border-2 border-border flex items-center justify-center text-2xl bg-muted">
                      {selectedEmoji}
                    </div>
                  </div>
                  <ScrollArea className="h-32 w-full rounded-md border">
                    <div className="p-4 grid grid-cols-8 gap-2">
                      {workspaceEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleEmojiSelect(emoji)}
                          aria-label={emoji}
                          aria-pressed={selectedEmoji === emoji}
                          className={`w-10 h-10 sm:w-8 sm:h-8 rounded flex items-center justify-center text-lg hover:bg-muted transition-colors ${
                            selectedEmoji === emoji ? 'bg-primary text-primary-foreground' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {imageType === 'url' && (
                <div className="flex flex-col gap-y-2">
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('workspace.imageUrl')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('workspace.imageUrlPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>{t('workspace.imageUrlDescription')}</FormDescription>
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
                          alt="Workspace preview"
                          className="w-full h-full object-cover"
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                  setSelectedEmoji('🏢');
                  setImageType('emoji');
                }}
                disabled={isCreating}
              >
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('workspace.creating')}
                  </>
                ) : (
                  t('workspace.createWorkspace')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
