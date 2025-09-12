import React, { useEffect, useState } from 'react';
import { IWorkspace } from '../types';
import { useSaaSWorkspaces } from '../hooks';
import { Switch } from '../../../components/ui/switch';
import { Skeleton } from '../../../components/ui/skeleton';

const WorkspaceSettingsFeatures: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [updatingFeatures, setUpdatingFeatures] = useState<Record<string, boolean>>({});
  const { allFeatures, updateFeature, getWorkspace } = useSaaSWorkspaces();
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);

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
    return (
      <div className="space-y-3.5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-y-3.5 pr-4">
        {allFeatures.map(feature => {
          const state = workspace?.features?.[feature.slug];
          return (
            <div key={feature._id} className="flex items-center gap-x-2 justify-between w-full">
              <div className="flex gap-x-2 flex-col">
                <h3 className="font-medium text-ellipsis">{feature.name}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
              <Switch
                disabled={updatingFeatures[feature.slug]}
                checked={state ?? feature.defaultValue}
                onCheckedChange={value => _updateFeature(feature.slug, value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkspaceSettingsFeatures;
