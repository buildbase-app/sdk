import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { IWorkspace } from '../types';
import { z } from 'zod';
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
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';

const WorkspaceSettingsProfile: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const { user } = useAppSelector(state => state.auth);
  const [oldName, setOldName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const formSchema = z.object({
    name: z.string().min(2, {
      message: 'Name must be at least 2 characters.',
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    // await updateUser(values.name);
    setIsSaving(false);
    console.log(values);
  }

  return (
    <div>
      <div className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              disabled={isSaving}
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    This is your name. It will be displayed to other users.
                  </FormDescription>
                </FormItem>
              )}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100"
                value={user?.email}
              />
            </div>
            <div className="flex justify-end gap-x-2">
              <Button
                type="submit"
                progress={isSaving}
                disabled={isSaving || oldName === form.getValues('name')}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOldName(user?.name || '');
                  form.reset({
                    name: user?.name || '',
                  });
                }}
                disabled={isSaving}
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>
      </div>
      {user?.image && (
        <div>
          <label className="block text-sm font-medium mb-1">Profile Image</label>
          <div className="w-16 h-16 rounded-full overflow-hidden">
            <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettingsProfile;
