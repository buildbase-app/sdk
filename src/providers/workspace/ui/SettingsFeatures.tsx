import React, { useEffect, useState } from 'react';
import { Switch } from '../../../components/ui/switch';
import { useAppSelector } from '../../../contexts';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsFeatures: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [updatingFeatures, setUpdatingFeatures] = useState<Record<string, boolean>>({});
  const { allFeatures, updateFeature, getWorkspace } = useSaaSWorkspaces();
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const currentUser = useAppSelector(state => state.auth.session?.user || null);

  useEffect(() => {
    getWorkspace(workspaceId).then(setWorkspace);
  }, [workspaceId]);

  async function _updateFeature(key: string, value: boolean) {
    if (!workspace) return;
    setUpdatingFeatures(prev => ({ ...prev, [key]: value }));
    const data = await updateFeature(workspace._id, key, value);
    setWorkspace(data);
    setUpdatingFeatures(prev => ({ ...prev, [key]: false }));
  }

  if (!workspace) {
    return <SettingSkeleton />;
  }

  const myRole = workspace?.users.find(user => {
    const id = typeof user === 'string' ? user : user._id;
    return id === currentUser?.id;
  })?.role as string;

  const amIAdmin = myRole?.toLowerCase() === 'admin';

  return (
    <div>
      <div className="flex flex-col gap-y-3.5 pr-4">
        {!amIAdmin && (
          <div className="text-red-500">Only workspace admin can change the features.</div>
        )}
        {!allFeatures.length && (
          <div className="text-muted-foreground">Workspace has no features to manage.</div>
        )}
        {allFeatures.length > 0 && (
          <div className="flex flex-col gap-y-3.5">
            {allFeatures.map(feature => {
              const state = workspace?.features?.[feature.slug];
              return (
                <div key={feature._id} className="flex items-center gap-x-2 justify-between w-full">
                  <div className="flex gap-x-2 flex-col">
                    <h3 className="font-medium text-ellipsis">{feature.name}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                  <Switch
                    disabled={updatingFeatures[feature.slug] || !amIAdmin}
                    checked={state ?? feature.defaultValue}
                    onCheckedChange={value => _updateFeature(feature.slug, value)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSettingsFeatures;
