import { ReactNode, useEffect, useState } from 'react';
import { useSaaSWorkspaces } from './hooks';
import { z } from 'zod';
import type { IWorkspace } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import {
  Building2,
  Search,
  Users,
  Check,
  Loader2,
  Plus,
  Crown,
  Image,
  Smile,
  EditIcon,
  RefreshCcw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import WorkspaceSettingsDialog from './ui/SettingsDialog';
import { cn } from '../../lib/utils';
import { getSvgImage, workspaceEmojis } from './ui/utils';

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export function WorkspaceSwitcher(props: {
  trigger: (currentWorkspace: IWorkspace | null) => ReactNode;
  onWorkspaceChange: (workspace: IWorkspace) => Promise<void>;
}) {
  const dispatch = useAppDispatch();
  const { workspaces, currentWorkspace, loading, refreshing } = useAppSelector(
    state => state.workspaces
  );
  const { user } = useAppSelector(state => state.auth);
  const [open, setOpen] = useState(false);
  const [reloadWorkspacesCount, setReloadWorkspacesCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { fetchWorkspaces, refreshWorkspaces, setCurrentWorkspace } = useSaaSWorkspaces();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [reloadWorkspacesCount]);

  function reloadWorkspaces() {
    setReloadWorkspacesCount(prev => prev + 1);
  }

  // Filter workspaces based on search query
  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getWorkspaceInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.trigger?.(currentWorkspace)}</DialogTrigger>
      {/* Dialog Content */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Switch Workspace
          </DialogTitle>
        </DialogHeader>
        {!user && (
          <div className="space-y-4 flex flex-col items-center justify-center h-full py-4 sm:py-8">
            <div className="text-sm font-medium text-muted-foreground">
              Looks like you are not logged in. Please login to continue.
            </div>
          </div>
        )}
        {user && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2/3 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Current Workspace */}
            {currentWorkspace && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Current Workspace</div>
                <div className="flex items-center gap-3 rounded-lg border-2 p-3 border-border bg-muted text-muted-foreground">
                  <Avatar className="h-8 w-8 flex items-center justify-center">
                    <div>
                      <AvatarImage src={currentWorkspace.image} />
                    </div>
                    <AvatarFallback>{getWorkspaceInitials(currentWorkspace.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{currentWorkspace.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{currentWorkspace.users?.length || 0} members</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Workspaces List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                  Available Workspaces ({filteredWorkspaces.length})
                </div>
                <div>
                  <Button
                    progress={refreshing}
                    disabled={refreshing}
                    variant="outline"
                    onClick={reloadWorkspaces}
                    startIcon={<RefreshCcw />}
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
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
                  <div className="space-y-2">
                    {filteredWorkspaces.map(workspace => {
                      const usersCount = workspace?.users?.length || 0;
                      const isAdmin = workspace.createdBy === user?.id;
                      const isCurrentWorkspace = workspace._id === currentWorkspace?._id;
                      return (
                        <div
                          key={workspace._id}
                          className={cn(
                            'w-full justify-start h-auto p-3 rounded-none flex border border-border ',
                            isCurrentWorkspace && 'bg-muted'
                          )}
                        >
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarImage src={workspace.image} />
                            <AvatarFallback>{getWorkspaceInitials(workspace.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{workspace.name}</span>
                              {isAdmin && <Crown className="h-3 w-3 text-amber-500" />}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>
                                {usersCount} member{usersCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              disabled={isCurrentWorkspace}
                              onClick={async () => {
                                await props.onWorkspaceChange(workspace);
                                setCurrentWorkspace(workspace);
                                setOpen(false);
                              }}
                            >
                              {isCurrentWorkspace ? 'Current' : 'Switch to'}
                            </Button>
                            <WorkspaceSettingsDialog
                              workspace={workspace}
                              onClose={() => {
                                if (currentWorkspace) {
                                  const index = workspaces.findIndex(
                                    w => w._id?.toString() === currentWorkspace._id?.toString()
                                  );
                                  if (index !== -1) {
                                    setCurrentWorkspace(workspaces[index]);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Create New Workspace */}
            <Separator />
            <CreateWorkspaceDialog
              onCreated={() => {
                fetchWorkspaces();
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>Create a new workspace to get started.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Workspace Icon</Label>
                <FormDescription>
                  Choose an emoji or upload a custom image for your workspace.
                </FormDescription>
              </div>

              <RadioGroup
                value={imageType}
                onValueChange={value => setImageType(value as 'emoji' | 'url')}
                className="flex flex-col space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="emoji" id="emoji" />
                  <Label htmlFor="emoji" className="flex items-center gap-2">
                    <Smile className="h-4 w-4" />
                    Choose Emoji
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="url" id="url" />
                  <Label htmlFor="url" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Custom Image URL
                  </Label>
                </div>
              </RadioGroup>

              {imageType === 'emoji' && (
                <div className="space-y-3">
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
                <div className="space-y-3">
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
                  {form.watch('image') && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Preview:</span>
                      <div className="w-12 h-12 rounded-lg border-2 border-border overflow-hidden bg-muted">
                        <img
                          src={form.watch('image')}
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
