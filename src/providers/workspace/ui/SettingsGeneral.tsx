import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Smile } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { useAppSelector } from '../../../contexts';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import { isWorkspaceOwner } from '../utils';
import SettingSkeleton from './Skeleton';
import { getSvgImage, workspaceEmojis } from './utils';

const WorkspaceSettingsGeneral: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageType, setImageType] = useState<'emoji' | 'url'>('emoji');
  const [selectedEmoji, setSelectedEmoji] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { updateWorkspace } = useSaaSWorkspaces();
  const currentUser = useAppSelector(state => state.auth.session?.user || null);

  const formSchema = z.object({
    name: z.string().min(2, {
      message: 'Workspace name must be at least 2 characters.',
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
    setSuccessMessage(null);
    try {
      await updateWorkspace(workspace, values);
      setSuccessMessage('Workspace settings saved successfully');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      console.error('Failed to update workspace:', error);
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

  const amIOwner = isWorkspaceOwner(workspace, currentUser?.id ?? null);

  return (
    <div>
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Success!</p>
          <p className="text-sm">{successMessage}</p>
        </div>
      )}
      {!amIOwner && (
        <div className="text-red-500">
          Only the workspace owner can change the workspace settings.
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="My Awesome Workspace" {...field} disabled={!amIOwner} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Icon</Label>
              <FormDescription>
                Choose an emoji or upload a custom image for your workspace.
              </FormDescription>
            </div>

            <RadioGroup
              value={imageType}
              disabled={!amIOwner}
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
                  <ImageIcon className="h-4 w-4" />
                  Custom Image URL
                </Label>
              </div>
            </RadioGroup>

            {imageType === 'emoji' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Preview:</span>
                  <div className="w-12 h-12 rounded-lg border-2 border-border flex items-center justify-center text-2xl bg-muted">
                    {selectedEmoji && <span className="text-2xl">{selectedEmoji}</span>}
                    {!selectedEmoji && form.watch('image')?.trim() && (
                      <img src={form.watch('image') || undefined} alt="Workspace preview" />
                    )}
                  </div>
                </div>
                {amIOwner && (
                  <ScrollArea className="h-32 w-full rounded-md border">
                    <div className="p-4 grid grid-cols-8 gap-2">
                      {workspaceEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleEmojiSelect(emoji)}
                          disabled={!amIOwner}
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
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.png"
                          {...field}
                          disabled={!amIOwner}
                        />
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
            {amIOwner && (
              <Button type="submit" disabled={isUpdating} progress={isUpdating}>
                Update Workspace
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default WorkspaceSettingsGeneral;
