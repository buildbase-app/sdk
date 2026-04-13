import { Bell, BellOff, ShieldAlert } from 'lucide-react';
import { useTranslation, type TranslationKey } from '../../../i18n';
import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import { usePushNotifications } from '../../push/PushNotificationContext';

type BrowserId = 'firefox' | 'safari' | 'edge' | 'chrome';

/** Detect browser for notification unblock instructions */
function detectBrowser(): BrowserId {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
  if (ua.includes('Edg')) return 'edge';
  return 'chrome';
}

/** Step count per browser — used to iterate t() keys */
const BROWSER_STEP_COUNT: Record<BrowserId, number> = {
  firefox: 4,
  safari: 4,
  edge: 4,
  chrome: 4,
};

const WorkspaceSettingsNotifications: React.FC = () => {
  const { isSupported, permission, isSubscribed, loading, error, subscribe, unsubscribe } =
    usePushNotifications();
  const { t } = useTranslation();

  const browser = useMemo(() => detectBrowser(), []);
  const stepCount = BROWSER_STEP_COUNT[browser];

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-500">
        {t('notifications.notSupported')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        {t('notifications.manageDescription')}
      </p>

      {error && permission !== 'denied' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Permission Denied — show browser-specific unblock instructions */}
      {permission === 'denied' && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">{t('notifications.blocked')}</h4>
              <p className="text-xs text-amber-700 mt-1">
                {t('notifications.blockedDescription')}
              </p>
              <ol className="text-xs text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                {Array.from({ length: stepCount }, (_, i) => (
                  <li key={i}>{t(`notifications.unblock.${browser}.step${i + 1}` as TranslationKey)}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Push Notifications Toggle */}
      {permission !== 'denied' && (
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-2 rounded-lg ${isSubscribed ? 'bg-green-100' : 'bg-gray-100'}`}>
                {isSubscribed ? (
                  <Bell className="h-4 w-4 text-green-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">{t('notifications.pushTitle')}</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('notifications.pushDescription', { subscribed: String(isSubscribed) })}
                </p>
              </div>
            </div>

            <Button
              variant={isSubscribed ? 'outline' : 'default'}
              size="sm"
              className="shrink-0"
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={loading}
              progress={loading}
            >
              {t('notifications.toggleAction', { loading: String(loading), subscribed: String(isSubscribed) })}
            </Button>
          </div>

          {isSubscribed && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              {t('notifications.deviceNote')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettingsNotifications;
