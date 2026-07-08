import { Loader2, ToggleRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { EmptyState } from '../../../components/ui/empty-state';
import { StatusBanner } from '../../../components/ui/status-banner';
import { Switch } from '../../../components/ui/switch';
import { usePermissions } from '../../../hooks/usePermissions';
import { useSuccessMessage } from '../../../hooks/useSuccessMessage';
import { useTranslation } from '../../../i18n';
import { handleError } from '../../../lib/error-handler';
import { Permission } from '../../../lib/permissions';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace } from '../types';
import NoPermission from './NoPermission';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsFeatures: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const { t } = useTranslation();
  const { allFeatures, updateFeature, getWorkspace } = useSaaSWorkspaces();
  const { can } = usePermissions();
  const [updatingFeatures, setUpdatingFeatures] = useState<Record<string, boolean | null>>({});
  const success = useSuccessMessage();
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);

  useEffect(() => {
    getWorkspace(workspaceId)
      .then(setWorkspace)
      .catch(error => {
        handleError(error, { component: 'WorkspaceSettingsFeatures', action: 'getWorkspace' });
      });
  }, [workspaceId]);

  async function _updateFeature(key: string, value: boolean) {
    if (!workspace) return;
    setUpdatingFeatures(prev => ({ ...prev, [key]: value }));
    success.clear();
    try {
      const data = await updateFeature(workspace._id, key, value);
      setWorkspace(data);
      const feature = allFeatures.find(f => f.slug === key);
      const featureName = feature?.name || 'Feature';
      success.show(t('features.updateSuccess', { feature: featureName, enabled: String(value) }));
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
      {success.message && (
        <StatusBanner
          variant="success"
          title={t('settings.common.success')}
          message={success.message}
          className="mb-4"
        />
      )}
      <div className="flex flex-col gap-y-3.5 pe-4">
        {!canEditFeatures && <NoPermission descriptionKey="features.ownerOnly" />}
        {!allFeatures.length && (
          <EmptyState
            icon={<ToggleRight className="h-5 w-5 text-muted-foreground" />}
            description={t('features.noFeatures')}
          />
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
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{actionText}...</span>
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
