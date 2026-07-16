'use client';

import { Bell, Check, Monitor, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { useUIConfig } from '../../contexts/UIConfigContext';
import { useUIVisibility } from '../../hooks/useUIVisibility';
import { useTranslation } from '../../i18n';
import { describeAgent, isMobileAgent } from '../../lib/device-display';
import { formatDate } from '../../lib/format-utils';
import { cn } from '../../lib/utils';
import type { IDeviceView } from '../../providers/devices/api';
import { useDevices } from '../../providers/devices/hooks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { Input } from '../ui/input';
import { SectionHeader } from '../ui/section-header';
import { Skeleton } from '../ui/skeleton';

export interface DevicesProps {
  /** Extra classes for the root element. */
  className?: string;
  /** Heading text. Defaults to the translated title; set to null to hide. */
  title?: string | null;
  /** Sub-heading under the title. Defaults to the translated description; null to hide. */
  description?: string | null;
  /** Show the Rename action. Defaults to the `settings.devices.rename` UI config (visible). */
  showRename?: boolean;
  /** Show the Sign out action. Defaults to the `settings.devices.signOut` UI config (visible). */
  showSignOut?: boolean;
  /** Show the Remove ("forget") action. Defaults to the `settings.devices.forget` UI config (visible). */
  showRemove?: boolean;
  /** Override the Rename button label. */
  renameLabel?: string;
  /** Override the Sign out button label. */
  signOutLabel?: string;
  /** Override the Remove button label. */
  removeLabel?: string;
  /** Text shown when the user has no devices. */
  emptyLabel?: string;
}

/** "City, Country · IP" — only the parts we actually have, joined with a dot. */
function whereLabel(device: IDeviceView): string {
  const location = [device.ipInfo?.city, device.ipInfo?.country].filter(Boolean).join(', ');
  return [location, device.ip].filter(Boolean).join(' · ');
}

/**
 * A ready-made "Devices" screen: lists the devices the signed-in user has
 * signed in from, with rename, sign-out (revoke a device's sessions) and remove
 * (also drop the row) actions. The device the request came from is badged
 * "This device". Session-authed and scoped to the current user — no config
 * beyond having the app wrapped in <SaaSOSProvider>.
 *
 * For a fully custom UI, use the `useDevices()` hook.
 */
export function Devices({
  className,
  title,
  description,
  showRename,
  showSignOut,
  showRemove,
  renameLabel,
  signOutLabel,
  removeLabel,
  emptyLabel,
}: DevicesProps) {
  const { t, formattingLocale } = useTranslation();
  const { formats } = useUIConfig();
  const { visible } = useUIVisibility();
  const { devices, loading, error, busyId, rename, signOut, forget } = useDevices();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  // Single, state-controlled confirm dialog (no per-row triggers).
  const [forgetTarget, setForgetTarget] = useState<IDeviceView | null>(null);

  // Per-action visibility: an explicit prop wins; otherwise fall back to the
  // provider's `settings.devices.*` UI config (visible unless set to false).
  const canRename = showRename ?? visible(ui => ui.settings?.devices?.rename);
  const canSignOut = showSignOut ?? visible(ui => ui.settings?.devices?.signOut);
  const canRemove = showRemove ?? visible(ui => ui.settings?.devices?.forget);
  const hasActions = canRename || canSignOut || canRemove;

  const resolvedTitle = title === undefined ? t('security.devicesTitle') : title;
  const resolvedDescription =
    description === undefined ? t('security.devicesDescription') : description;
  const renameLabelText = renameLabel ?? t('security.deviceRename');
  const signOutLabelText = signOutLabel ?? t('security.deviceSignOut');
  const removeLabelText = removeLabel ?? t('security.deviceForget');
  const emptyLabelText = emptyLabel ?? t('security.devicesEmpty');

  const formatWhen = (isoDate: string): string =>
    formatDate(isoDate, formattingLocale, formats?.date ?? { dateStyle: 'medium' });

  const startRename = (device: IDeviceView) => {
    setEditingId(device.deviceId);
    setDraftName(device.name);
  };

  const commitRename = async (deviceId: string) => {
    const name = draftName.trim();
    if (name) await rename(deviceId, name);
    setEditingId(null);
  };

  const confirmForget = async () => {
    if (!forgetTarget) return;
    const { deviceId } = forgetTarget;
    setForgetTarget(null);
    await forget(deviceId);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <SectionHeader title={resolvedTitle} description={resolvedDescription} />

      {loading && (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      )}

      {error && !loading && <p className="text-destructive text-sm">{error}</p>}

      {!loading && !error && devices.length === 0 && (
        <EmptyState
          icon={<Monitor className="h-5 w-5 text-muted-foreground" />}
          description={emptyLabelText}
        />
      )}

      {!loading && devices.length > 0 && (
        <ul className="space-y-3">
          {devices.map(device => {
            const isEditing = editingId === device.deviceId;
            const busy = busyId === device.deviceId;
            const agent = describeAgent(device.userAgent);
            const where = whereLabel(device);
            const DeviceIcon = isMobileAgent(device.userAgent) ? Smartphone : Monitor;
            return (
              <li
                key={device.deviceId}
                className="flex items-start justify-between gap-x-4 rounded-md border p-3"
              >
                <div className="flex min-w-0 gap-x-3">
                  <DeviceIcon
                    className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-col gap-y-1">
                    {isEditing ? (
                      <div className="flex items-center gap-x-2">
                        <Input
                          value={draftName}
                          onChange={e => setDraftName(e.target.value)}
                          placeholder={t('security.deviceRenamePlaceholder')}
                          className="h-8 w-48"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitRename(device.deviceId);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t('security.deviceSave')}
                          progress={busy}
                          onClick={() => commitRename(device.deviceId)}
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t('security.deviceCancel')}
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium break-words">{device.name}</span>
                        {device.current && (
                          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
                            {t('security.deviceCurrent')}
                          </span>
                        )}
                        {device.trusted && (
                          <span className="text-primary inline-flex items-center gap-x-1 text-xs">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('security.deviceTrusted')}
                          </span>
                        )}
                        {device.pushEnabled && (
                          <span
                            className="text-muted-foreground inline-flex"
                            aria-label={t('security.devicePushEnabled')}
                            title={t('security.devicePushEnabled')}
                          >
                            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    )}

                    {agent && (
                      <span className="text-muted-foreground text-xs break-words">{agent}</span>
                    )}
                    {where && (
                      <span className="text-muted-foreground text-xs break-words">{where}</span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {device.lastActiveAt &&
                        t('security.deviceLastActive', {
                          date: formatWhen(device.lastActiveAt),
                        })}
                      {device.activeSessions > 0 && (
                        <>
                          {device.lastActiveAt && ' · '}
                          {t('security.deviceActiveSessions', { count: device.activeSessions })}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {!isEditing && hasActions && (
                  <div className="flex shrink-0 flex-col items-end gap-y-1.5">
                    {(canRename || canSignOut) && (
                      <div className="flex items-center gap-x-1.5">
                        {canRename && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => startRename(device)}
                          >
                            {renameLabelText}
                          </Button>
                        )}
                        {canSignOut && device.activeSessions > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            progress={busy}
                            onClick={() => signOut(device.deviceId)}
                          >
                            {signOutLabelText}
                          </Button>
                        )}
                      </div>
                    )}
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={busy}
                        onClick={() => setForgetTarget(device)}
                      >
                        {removeLabelText}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={forgetTarget !== null}
        onOpenChange={open => {
          if (!open) setForgetTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('security.deviceForgetConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('security.deviceForgetConfirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('security.deviceCancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmForget}
            >
              {removeLabelText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
