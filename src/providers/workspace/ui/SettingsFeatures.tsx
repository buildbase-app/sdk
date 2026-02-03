import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Switch } from '../../../components/ui/switch';
import { handleError } from '../../../lib/error-handler';
import { useSaaSAuth } from '../../auth/hooks';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import { isWorkspaceOwner } from '../utils';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsFeatures: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [updatingFeatures, setUpdatingFeatures] = useState<Record<string, boolean | null>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { allFeatures, updateFeature, getWorkspace } = useSaaSWorkspaces();
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const { user: currentUser } = useSaaSAuth();

  useEffect(() => {
    getWorkspace(workspaceId).then(setWorkspace);
  }, [workspaceId]);

  async function _updateFeature(key: string, value: boolean) {
    if (!workspace) return;
    setUpdatingFeatures(prev => ({ ...prev, [key]: value }));
    setSuccessMessage(null);
    try {
      const data = await updateFeature(workspace._id, key, value);
      setWorkspace(data);
      const feature = allFeatures.find(f => f.slug === key);
      const featureName = feature?.name || 'Feature';
      setSuccessMessage(`${featureName} ${value ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      handleError(error, {
        component: 'WorkspaceSettingsFeatures',
        action: 'updateFeature',
        metadata: { workspaceId: workspace._id, featureKey: key },
      });
    } finally {
      setUpdatingFeatures(prev => ({ ...prev, [key]: null }));
    }
  }

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
      <div className="flex flex-col gap-y-3.5 pr-4">
        {!amIOwner && (
          <div className="text-red-500">Only the workspace owner can change the features.</div>
        )}
        {!allFeatures.length && (
          <div className="text-muted-foreground">Workspace has no features to manage.</div>
        )}
        {allFeatures.length > 0 && (
          <div className="flex flex-col gap-y-3.5">
            {allFeatures.map(feature => {
              const state = workspace?.features?.[feature.slug];
              const isUpdating =
                updatingFeatures[feature.slug] !== null &&
                updatingFeatures[feature.slug] !== undefined;
              const targetValue = updatingFeatures[feature.slug];
              const actionText =
                targetValue === true ? 'Enabling' : targetValue === false ? 'Disabling' : '';

              return (
                <div key={feature._id} className="flex items-center gap-x-2 justify-between w-full">
                  <div className="flex gap-x-2 flex-col">
                    <h3 className="font-medium text-ellipsis">{feature.name}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                  {!isUpdating ? (
                    <Switch
                      disabled={!amIOwner}
                      checked={state ?? feature.defaultValue}
                      onCheckedChange={value => _updateFeature(feature.slug, value)}
                    />
                  ) : (
                    <div className="flex items-center gap-x-1">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="text-sm text-gray-600">{actionText}...</span>
                    </div>
                  )}
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
