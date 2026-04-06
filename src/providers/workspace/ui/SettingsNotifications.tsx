import { Bell, BellOff, ShieldAlert } from 'lucide-react';
import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import { usePushNotifications } from '../../push/PushNotificationContext';

function getBrowserUnblockInstructions(): { browser: string; steps: string[] } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  if (ua.includes('Firefox')) {
    return {
      browser: 'Firefox',
      steps: [
        'Click the lock icon (or shield icon) in the address bar',
        'Find "Notifications" in the permissions list',
        'Change from "Blocked" to "Allow"',
        'Reload this page',
      ],
    };
  }

  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    return {
      browser: 'Safari',
      steps: [
        'Open Safari → Settings → Websites → Notifications',
        'Find this website in the list',
        'Change from "Deny" to "Allow"',
        'Reload this page',
      ],
    };
  }

  if (ua.includes('Edg')) {
    return {
      browser: 'Edge',
      steps: [
        'Click the lock icon in the address bar',
        'Click "Permissions for this site"',
        'Set "Notifications" to "Allow"',
        'Reload this page',
      ],
    };
  }

  // Default: Chrome / Chromium
  return {
    browser: 'Chrome',
    steps: [
      'Click the lock icon (or tune icon) in the address bar',
      'Click "Site settings"',
      'Set "Notifications" to "Allow"',
      'Reload this page',
    ],
  };
}

const WorkspaceSettingsNotifications: React.FC = () => {
  const { isSupported, permission, isSubscribed, loading, error, subscribe, unsubscribe } =
    usePushNotifications();

  const unblockInfo = useMemo(() => getBrowserUnblockInstructions(), []);

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-500">
        Push notifications are not supported in this browser.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Manage how you receive notifications from this workspace.
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
              <h4 className="text-sm font-medium text-amber-800">Notifications Blocked</h4>
              <p className="text-xs text-amber-700 mt-1">
                You previously blocked notifications for this site. To enable them, update your {unblockInfo.browser} settings:
              </p>
              <ol className="text-xs text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                {unblockInfo.steps.map((step, i) => (
                  <li key={i}>{step}</li>
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
                <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isSubscribed
                    ? 'You will receive browser notifications for important updates.'
                    : 'Get notified about payment issues, trial expiry, and other important updates.'}
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
              {loading
                ? isSubscribed ? 'Disabling...' : 'Enabling...'
                : isSubscribed ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {isSubscribed && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              Notifications are sent to this device. Enable on other devices separately.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettingsNotifications;
