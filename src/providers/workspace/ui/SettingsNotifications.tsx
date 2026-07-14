import { Bell, BellOff, Mail, ShieldAlert, Smartphone } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NotificationEvent } from '../../../api/services/workspace-api';
import { Button } from '../../../components/ui/button';
import { StatusBanner } from '../../../components/ui/status-banner';
import { Switch } from '../../../components/ui/switch';
import { usePermissions } from '../../../hooks/usePermissions';
import { useUIVisibility } from '../../../hooks/useUIVisibility';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { handleError } from '../../../lib/error-handler';
import { Permission } from '../../../lib/permissions';
import { usePushNotifications } from '../../push/PushNotificationContext';
import { IWorkspace } from '../types';
import { useWorkspaceApiWithOs } from '../use-workspace-api';

type BrowserId = 'firefox' | 'safari' | 'edge' | 'chrome';

function detectBrowser(): BrowserId {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
  if (ua.includes('Edg')) return 'edge';
  return 'chrome';
}

const BROWSER_STEP_COUNT: Record<BrowserId, number> = {
  firefox: 4,
  safari: 4,
  edge: 4,
  chrome: 4,
};

// ─── Types ───────────────────────────────────────────────────────

type ChannelPref = { email?: boolean; push?: boolean };
type Preferences = Record<string, ChannelPref>;

// ─── Component ───────────────────────────────────────────────────

const WorkspaceSettingsNotifications: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  const { t } = useTranslation();
  const { api } = useWorkspaceApiWithOs();
  const { can } = usePermissions();
  const { visible } = useUIVisibility();
  const canEdit = can(Permission.WORKSPACE_SETTINGS_EDIT);
  const showPushBlock = visible(ui => ui.settings?.notifications?.push);
  const showEmailToggles = visible(ui => ui.settings?.notifications?.emailToggles);
  const showPushToggles = visible(ui => ui.settings?.notifications?.pushToggles);

  const browser = useMemo(() => detectBrowser(), []);
  const stepCount = BROWSER_STEP_COUNT[browser];

  // Dynamic events from server (only userManaged + enabled)
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Fetch user-manageable events + current preferences
  useEffect(() => {
    if (!workspace?._id) return;
    const wsId = workspace._id.toString();

    setLoadingEvents(true);
    setLoadingPrefs(true);

    Promise.all([
      api.getNotificationEvents(wsId).catch(() => [] as NotificationEvent[]),
      api.getNotificationPreferences(wsId).catch(() => ({}) as Preferences),
    ])
      .then(([evts, prefs]) => {
        setEvents(evts);
        setPreferences(prefs);
      })
      .finally(() => {
        setLoadingEvents(false);
        setLoadingPrefs(false);
      });
  }, [workspace?._id]);

  const toggleChannel = useCallback(
    async (eventSlug: string, channel: 'email' | 'push', currentValue: boolean) => {
      if (!workspace?._id || !canEdit) return;
      const newValue = !currentValue;
      const updateKey = `${eventSlug}.${channel}`;
      setUpdating(updateKey);
      setSuccessMsg(null);

      // Optimistic update
      setPreferences(prev => ({
        ...prev,
        [eventSlug]: { ...prev[eventSlug], [channel]: newValue },
      }));

      try {
        const updated = await api.updateNotificationPreferences(workspace._id.toString(), {
          [eventSlug]: { [channel]: newValue },
        });
        setPreferences(updated);
        setSuccessMsg(t('notifications.prefsSaved'));
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSuccessMsg(null), 3000);
      } catch (error) {
        // Revert
        setPreferences(prev => ({
          ...prev,
          [eventSlug]: { ...prev[eventSlug], [channel]: currentValue },
        }));
        handleError(error, { component: 'SettingsNotifications', action: 'toggleChannel' });
      } finally {
        setUpdating(null);
      }
    },
    [workspace?._id, canEdit, api, t]
  );

  const getChannelValue = (eventSlug: string, channel: 'email' | 'push'): boolean => {
    return preferences[eventSlug]?.[channel] !== false;
  };

  // Group events by category
  const grouped = useMemo(() => {
    const map = new Map<string, NotificationEvent[]>();
    for (const evt of events) {
      const cat = evt.category || 'general';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(evt);
    }
    return Array.from(map.entries());
  }, [events]);

  const loading = loadingEvents || loadingPrefs;
  const hasEvents = events.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('notifications.manageDescription')}</p>

      {/* ─── Push Notifications (browser-level) ─── */}
      {showPushBlock && isSupported && (
        <>
          {pushError && permission !== 'denied' && (
            <StatusBanner variant="error" message={pushError} />
          )}

          {permission === 'denied' && (
            <div className="border border-warning/30 bg-warning/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-warning">{t('notifications.blocked')}</h4>
                  <p className="text-xs text-warning mt-1">
                    {t('notifications.blockedDescription')}
                  </p>
                  <ol className="text-xs text-warning mt-2 space-y-1 list-decimal list-inside">
                    {Array.from({ length: stepCount }, (_, i) => (
                      <li key={i}>
                        {t(`notifications.unblock.${browser}.step${i + 1}` as TranslationKey)}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {permission !== 'denied' && (
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-2 rounded-lg ${isSubscribed ? 'bg-success/15' : 'bg-muted'}`}
                  >
                    {isSubscribed ? (
                      <Bell className="h-4 w-4 text-success" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground/70" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {t('notifications.pushTitle')}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('notifications.pushDescription', { subscribed: String(isSubscribed) })}
                    </p>
                  </div>
                </div>
                <Button
                  variant={isSubscribed ? 'outline' : 'default'}
                  size="sm"
                  className="shrink-0"
                  onClick={isSubscribed ? unsubscribe : subscribe}
                  disabled={pushLoading}
                  progress={pushLoading}
                >
                  {t('notifications.toggleAction', {
                    loading: String(pushLoading),
                    subscribed: String(isSubscribed),
                  })}
                </Button>
              </div>
              {isSubscribed && (
                <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                  {t('notifications.deviceNote')}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Per-event notification preferences (only user-manageable custom events) ─── */}
      {loading && (
        <div className="text-center text-sm text-muted-foreground/70 py-4">
          {t('notifications.loadingPrefs')}
        </div>
      )}

      {!loading && hasEvents && canEdit && (showEmailToggles || showPushToggles) && (
        <>
          {successMsg && <StatusBanner variant="success" message={successMsg} />}

          {grouped.map(([category, categoryEvents]) => (
            <div key={category} className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5 border-b">
                <h4 className="text-sm font-medium text-foreground capitalize">{category}</h4>
              </div>
              <div className="divide-y">
                {/* Header row */}
                <div className="flex items-center px-4 py-2 bg-muted/30">
                  <div className="flex-1" />
                  <div className="flex items-center gap-6">
                    {showEmailToggles && (
                      <div className="w-12 flex justify-center">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                      </div>
                    )}
                    {showPushToggles && (
                      <div className="w-12 flex justify-center">
                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground/70" />
                      </div>
                    )}
                  </div>
                </div>
                {categoryEvents.map(event => {
                  const emailOn = getChannelValue(event.slug, 'email');
                  const pushOn = getChannelValue(event.slug, 'push');
                  const emailUpdating = updating === `${event.slug}.email`;
                  const pushUpdating = updating === `${event.slug}.push`;

                  return (
                    <div key={event.slug} className="flex items-center px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{event.name}</div>
                        {event.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {event.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        {showEmailToggles && (
                          <div className="w-12 flex justify-center">
                            {event.channels.email ? (
                              <Switch
                                checked={emailOn}
                                onCheckedChange={() => toggleChannel(event.slug, 'email', emailOn)}
                                disabled={emailUpdating}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </div>
                        )}
                        {showPushToggles && (
                          <div className="w-12 flex justify-center">
                            {event.channels.push ? (
                              <Switch
                                checked={pushOn}
                                onCheckedChange={() => toggleChannel(event.slug, 'push', pushOn)}
                                disabled={pushUpdating}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default WorkspaceSettingsNotifications;
