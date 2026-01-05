import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Image, Loader2, Plus, RefreshCcw, Search, Smile, Users } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
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
import { useAppSelector } from '../../contexts';
import { handleError } from '../../lib/error-handler';
import { cn } from '../../lib/utils';
import { useSaaSSettings } from '../os/hooks';
import { useSaaSWorkspaces } from './hooks';
import type { IWorkspace } from './types';
import WorkspaceSettingsDialog from './ui/SettingsDialog';
import { getSvgImage, workspaceEmojis } from './ui/utils';

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export function WorkspaceSwitcher(props: {
  trigger: (isLoading: boolean, currentWorkspace: IWorkspace | null) => ReactNode;
  onWorkspaceChange: (workspace: IWorkspace) => Promise<void>;
}) {
  const {
    workspaces: workspacesFromState,
    currentWorkspace,
    loading,
    refreshing,
  } = useAppSelector(state => state.workspaces);
  const user = useAppSelector(state => state.auth.session?.user);
  const { settings } = useSaaSSettings();
  const [open, setOpen] = useState(false);
  const [reloadWorkspacesCount, setReloadWorkspacesCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { fetchWorkspaces, getFeatures, refreshWorkspaces, setCurrentWorkspace, workspaces } =
    useSaaSWorkspaces();

  // Combine loading and refreshing states for trigger
  const isLoading = loading || refreshing;

  // Fetch workspaces and features only once on mount, and only if not already loaded
  useEffect(() => {
    // Only fetch if workspaces are empty (not already loaded)
    if (workspaces.length === 0) {
      fetchWorkspaces();
      getFeatures();
    } else {
      // If workspaces are already loaded, just ensure features are loaded
      getFeatures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run on mount

  // Refresh workspaces when reloadWorkspacesCount changes (but don't fetch features again)
  useEffect(() => {
    if (reloadWorkspacesCount > 0) {
      refreshWorkspaces();
      // Don't call getFeatures here - features don't need to be refreshed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadWorkspacesCount]); // Only refresh workspaces, not features

  function reloadWorkspaces() {
    setReloadWorkspacesCount(prev => prev + 1);
  }

  // Use workspaces from hook (which comes from state)
  const workspacesToUse = workspaces.length > 0 ? workspaces : workspacesFromState;

  // Filter workspaces based on search query
  const filteredWorkspaces = workspacesToUse
    .filter(workspace => workspace._id !== currentWorkspace?._id)
    .filter(workspace => workspace.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalAllowedWorkspaces = settings?.workspace.maxWorkspaces ?? Number.MAX_VALUE;
  const myWorkspacesCount = workspacesToUse?.filter(workspace => {
    const createdBy =
      typeof workspace.createdBy === 'object'
        ? workspace.createdBy._id?.toString()
        : workspace.createdBy?.toString();
    return createdBy === user?.id?.toString();
  }).length;
  const allowedToCreateWorkspace = totalAllowedWorkspaces > (myWorkspacesCount ?? 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{props.trigger?.(isLoading, currentWorkspace)}</DialogTrigger>
      {/* Dialog Content */}
      <DialogContent className="max-w-2xl min-w-full sm:min-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Switch Workspace
          </DialogTitle>
          <DialogDescription>
            Select a workspace to switch to or create a new one.
          </DialogDescription>
        </DialogHeader>
        {!user && (
          <div className="flex flex-col items-center justify-center h-full py-4 sm:py-8">
            <div className="text-sm font-medium text-muted-foreground">
              Looks like you are not logged in. Please login to continue.
            </div>
          </div>
        )}
        {user && (
          <div className="flex flex-col gap-4">
            {/* Current Workspace */}
            {currentWorkspace && (
              <WorkspaceItem
                workspace={currentWorkspace}
                isCurrentWorkspace={true}
                onWorkspaceChange={props.onWorkspaceChange}
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
                  Available Workspaces ({filteredWorkspaces.length})
                </div>
                <div>
                  <Button
                    progress={refreshing}
                    disabled={refreshing}
                    variant="ghost"
                    onClick={reloadWorkspaces}
                    startIcon={<RefreshCcw />}
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search workspaces..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading workspaces...</span>
                </div>
              ) : filteredWorkspaces.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchQuery ? 'No workspaces found' : 'No workspaces available'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="flex flex-col gap-2 my-2.5">
                    {filteredWorkspaces.map(workspace => {
                      const isCurrentWorkspace = workspace._id === currentWorkspace?._id;
                      return (
                        <WorkspaceItem
                          key={workspace._id}
                          workspace={workspace}
                          isCurrentWorkspace={isCurrentWorkspace}
                          onWorkspaceChange={props.onWorkspaceChange}
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
  onWorkspaceChange: (workspace: IWorkspace) => Promise<void>;
  onClose: () => void;
  setCurrentWorkspace: (workspace: IWorkspace) => void;
  setOpen: (open: boolean) => void;
  workspacesToUse: IWorkspace[];
}

function WorkspaceItem(props: WorkspaceItemProps) {
  const { workspace, setCurrentWorkspace, setOpen, workspacesToUse } = props;
  const isCurrentWorkspace = props.isCurrentWorkspace ?? false;
  const [isSwitching, setIsSwitching] = useState(false);

  const getWorkspaceInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
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
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{workspace.users?.length || 0} members</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isCurrentWorkspace ? null : (
          <Button
            size="sm"
            disabled={isSwitching}
            progress={isSwitching}
            onClick={() => {
              setIsSwitching(true);
              props
                .onWorkspaceChange(workspace)
                .then(() => {
                  setCurrentWorkspace(workspace);
                  setOpen(false);
                })
                .catch(error => {
                  handleError(error, {
                    component: 'WorkspaceItem',
                    action: 'onWorkspaceChange',
                    metadata: { workspaceId: workspace._id },
                  });
                })
                .finally(() => {
                  setIsSwitching(false);
                });
            }}
          >
            Switch to
          </Button>
        )}
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
      </div>
    </div>
  );
}

function CreateWorkspaceDialog(props: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [imageType, setImageType] = useState<'emoji' | 'url'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState('🏢');
  const [isCreating, setIsCreating] = useState(false);
  const { createWorkspace } = useSaaSWorkspaces();

  const formSchema = z.object({
    name: z.string().min(2, {
      message: 'Workspace name must be at least 2 characters.',
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
        form.setError('image', { message: 'Please enter a valid URL' });
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
      console.error('Failed to create workspace:', error);
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
        <Button className="w-full rounded-none">
          <Plus className="h-4 w-4 mr-2" />
          Create New Workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl min-w-full sm:min-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>Create a new workspace to get started.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Workspace" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-y-2 my-2">
              <div>
                <Label className="text-sm font-medium">Workspace Icon</Label>
                <FormDescription>
                  Choose an emoji or upload a custom image for your workspace.
                </FormDescription>
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
                    Choose Emoji
                  </Label>
                </div>
                <div className="flex items-center gap-x-2 my-1">
                  <RadioGroupItem value="url" id="url" />
                  <Label htmlFor="url" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Custom Image URL
                  </Label>
                </div>
              </RadioGroup>

              {imageType === 'emoji' && (
                <div className="flex flex-col gap-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Preview:</span>
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
                          className={`w-8 h-8 rounded flex items-center justify-center text-lg hover:bg-muted transition-colors ${
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
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.png" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter a valid URL for your workspace image. Supports PNG, JPG, and SVG
                          formats.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch('image') && form.watch('image')?.trim() && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Preview:</span>
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
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
