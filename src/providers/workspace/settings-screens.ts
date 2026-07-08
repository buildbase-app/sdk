/**
 * Settings screen identifiers — kept in a leaf module (no component imports)
 * so consumers of `SettingsScreen` don't pull the whole settings dialog
 * (and its 12 screens) into their bundle. The dialog itself is lazy-loaded.
 */
export const SettingsScreen = {
  Profile: 'profile',
  Security: 'security',
  ConnectedAgents: 'connected-agents',
  General: 'general',
  Users: 'users',
  Subscription: 'subscription',
  Usage: 'usage',
  Credits: 'credits',
  Features: 'features',
  Notifications: 'notifications',
  Permissions: 'permissions',
  Danger: 'danger',
} as const;

export type WorkspaceSettingsSection = (typeof SettingsScreen)[keyof typeof SettingsScreen];

/** Set of all valid section values — used for runtime validation */
export const SETTINGS_SCREENS = new Set<WorkspaceSettingsSection>(Object.values(SettingsScreen));
