import { Loader2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Switch } from '../../../components/ui/switch';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation } from '../../../i18n';
import { handleError } from '../../../lib/error-handler';
import { Permission } from '../../../lib/permissions';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsFeatures: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const { t } = useTranslation();
  const { allFeatures, updateFeature, getWorkspace } = useSaaSWorkspaces();
  const { can } = usePermissions();
  const [updatingFeatures, setUpdatingFeatures] = useState<Record<string, boolean | null>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

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
      setSuccessMessage(
        t('features.updateSuccess', { feature: featureName, enabled: String(value) })
      );
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
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

  const canEditFeatures = can(Permission.WORKSPACE_FEATURES_EDIT);

  return (
    <div>
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">{t('settings.common.success')}</p>
          <p className="text-sm">{successMessage}</p>
        </div>
      )}
      <div className="flex flex-col gap-y-3.5 pe-4">
        {!canEditFeatures && <div className="text-red-500">{t('features.ownerOnly')}</div>}
        {!allFeatures.length && (
          <div className="text-muted-foreground">{t('features.noFeatures')}</div>
        )}
        {allFeatures.length > 0 && (
          <div className="flex flex-col gap-y-3.5">
            {allFeatures.map(feature => {
              const state = workspace?.features?.[feature.slug];
              const isUpdating =
                updatingFeatures[feature.slug] !== null &&
                updatingFeatures[feature.slug] !== undefined;
              const targetValue = updatingFeatures[feature.slug];
              const actionText = t('features.actionStatus', {
                action:
                  targetValue === true ? 'enabling' : targetValue === false ? 'disabling' : 'none',
              });

              return (
                <div key={feature._id} className="flex items-center gap-x-2 justify-between w-full">
                  <div className="flex gap-x-2 flex-col">
                    <h3 className="font-medium text-ellipsis">{feature.name}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                  {!isUpdating ? (
                    <Switch
                      disabled={!canEditFeatures}
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
