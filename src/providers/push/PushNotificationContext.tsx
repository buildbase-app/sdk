import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../i18n';
import { useSaaSAuth } from '../auth/hooks';
import { useSaaSOs } from '../os/hooks';
import type { IOsState } from '../os/types';
import { PushApi } from './push-api';
import { handleError } from '../../lib/error-handler';

interface PushNotificationState {
  /** Browser's Notification.permission: 'default' | 'granted' | 'denied' */
  permission: NotificationPermission;
  /** Whether this device is subscribed to push notifications */
  isSubscribed: boolean;
  /** Whether the browser supports push notifications */
  isSupported: boolean;
  /** Loading state for subscribe/unsubscribe operations */
  loading: boolean;
  /** Error message from the last operation */
  error: string | null;
}

interface PushNotificationContextValue extends PushNotificationState {
  /** Request notification permission from the browser. Returns true if granted. */
  requestPermission: () => Promise<boolean>;
  /** Subscribe this device to push notifications (requests permission if needed). */
  subscribe: () => Promise<void>;
  /** Unsubscribe this device from push notifications. */
  unsubscribe: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextValue | null>(null);

export interface PushNotificationProviderProps {
  children: React.ReactNode;
  /** Path to the service worker file (default: '/push-sw.js') */
  serviceWorkerPath?: string;
  /** Automatically subscribe after permission is granted on login (default: false) */
  autoSubscribe?: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export const PushNotificationProvider: React.FC<PushNotificationProviderProps> = React.memo(
  function PushNotificationProvider({ children, serviceWorkerPath = '/push-sw.js', autoSubscribe = false }) {
    const { t } = useTranslation();
    const os = useSaaSOs();
    const { isAuthenticated } = useSaaSAuth();

    const isSupported = useMemo(() =>
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window,
    []);

    const api = useMemo(
      () =>
        new PushApi({
          serverUrl: os.serverUrl,
          version: os.version,
          orgId: os.orgId,
        }),
      [os.serverUrl, os.version, os.orgId]
    );

    const [state, setState] = useState<PushNotificationState>({
      permission: isSupported ? Notification.permission : 'default',
      isSubscribed: false,
      isSupported,
      loading: false,
      error: null,
    });

    // Check existing subscription on mount when authenticated
    useEffect(() => {
      if (!isAuthenticated || !isSupported) return;
      let cancelled = false;

      (async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration(serviceWorkerPath);
          if (cancelled) return;
          if (!registration) {
            setState((s) => ({ ...s, isSubscribed: false }));
            return;
          }
          const sub = await registration.pushManager.getSubscription();
          if (cancelled) return;
          setState((s) => ({
            ...s,
            isSubscribed: !!sub,
            permission: Notification.permission,
          }));
        } catch {
          if (!cancelled) setState((s) => ({ ...s, isSubscribed: false }));
        }
      })();

      return () => { cancelled = true; };
    }, [isAuthenticated, isSupported, serviceWorkerPath]);

    const requestPermission = useCallback(async (): Promise<boolean> => {
      if (!isSupported) return false;
      const result = await Notification.requestPermission();
      setState((s) => ({ ...s, permission: result }));
      return result === 'granted';
    }, [isSupported]);

    const subscribe = useCallback(async () => {
      if (!isSupported || !isAuthenticated) return;

      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        // 1. Request permission
        const granted = await requestPermission();
        if (!granted) {
          setState((s) => ({ ...s, loading: false, error: t('notifications.permissionDenied') }));
          return;
        }

        // 2. Get VAPID public key
        const { publicKey } = await api.getVapidPublicKey();

        // 3. Register service worker
        const registration = await navigator.serviceWorker.register(serviceWorkerPath);
        await navigator.serviceWorker.ready;

        // 4. Subscribe via PushManager
        const pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
        });

        // 5. Send to server
        const subJson = pushSubscription.toJSON();
        await api.subscribe(
          {
            endpoint: subJson.endpoint!,
            keys: { p256dh: subJson.keys!.p256dh!, auth: subJson.keys!.auth! },
          },
          navigator.userAgent
        );

        setState((s) => ({ ...s, isSubscribed: true, loading: false }));
        // Server sends a welcome notification automatically on subscribe
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : t('push.failedToSubscribe');
        setState((s) => ({ ...s, loading: false, error: msg }));
        handleError(err, { component: 'PushNotificationProvider', action: 'subscribe' });
      }
    }, [isSupported, isAuthenticated, api, serviceWorkerPath, requestPermission]);

    const unsubscribe = useCallback(async () => {
      if (!isSupported) return;

      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const registration = await navigator.serviceWorker.getRegistration(serviceWorkerPath);
        if (registration) {
          const sub = await registration.pushManager.getSubscription();
          if (sub) {
            const endpoint = sub.endpoint;
            await sub.unsubscribe();
            await api.unsubscribe(endpoint);
          }
        }
        setState((s) => ({ ...s, isSubscribed: false, loading: false }));
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : t('push.failedToUnsubscribe');
        setState((s) => ({ ...s, loading: false, error: msg }));
        handleError(err, { component: 'PushNotificationProvider', action: 'unsubscribe' });
      }
    }, [isSupported, api, serviceWorkerPath]);

    const value = useMemo<PushNotificationContextValue>(
      () => ({ ...state, requestPermission, subscribe, unsubscribe }),
      [state, requestPermission, subscribe, unsubscribe]
    );

    return (
      <PushNotificationContext.Provider value={value}>
        {children}
      </PushNotificationContext.Provider>
    );
  }
);

/**
 * Hook to access push notification state and actions.
 * Must be used within PushNotificationProvider (included in SaaSOSProvider when push config is provided).
 */
export function usePushNotifications(): PushNotificationContextValue {
  const ctx = useContext(PushNotificationContext);
  if (!ctx) {
    throw new Error('usePushNotifications must be used within PushNotificationProvider');
  }
  return ctx;
}
