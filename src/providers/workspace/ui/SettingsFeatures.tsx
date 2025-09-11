import React, { useEffect, useState } from 'react';
import { IWorkspace } from '../types';
import { useSaaSWorkspaces } from '../hooks';
import { Switch } from '../../../components/ui/switch';

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
    await updateFeature(workspace._id, key, value);
    setUpdatingFeatures(prev => ({ ...prev, [key]: false }));
  }

  if (!workspace) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Features</h2>
        <div className="text-gray-500">Loading features...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Features</h2>
      <div className="flex flex-col gap-y-2">
        {allFeatures.map(feature => {
          const state = workspace?.features?.[feature.slug];
          return (
            <div key={feature._id}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ellipsis">{feature.name}</h3>
                <Switch
                  disabled={updatingFeatures[feature.slug]}
                  checked={state ?? feature.defaultValue}
                  onCheckedChange={value => _updateFeature(feature.slug, value)}
                />
                {/* {updatingFeatures[feature.slug] && <Loader2 className="w-4 h-4 animate-spin" />} */}
              </div>
              <p className="text-gray-500">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkspaceSettingsFeatures;
