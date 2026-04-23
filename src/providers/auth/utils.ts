// Re-export session/auth utilities from canonical location in lib/
export {
  getAccessToken,
  getAuthHeaders,
  getSessionId,
  getTokenFromUrl,
  removeSession,
  removeTokenFromUrl,
  setSessionId,
} from '../../lib/auth-utils';

// Auth-specific utils that depend on provider types stay here
import type { IUser } from '../../api/types';
import type { AuthSession, AuthUser } from './types';

export function mapIUserToAuthUser(userData: IUser, orgId: string, clientId: string): AuthUser {
  const userId = userData._id || userData.id;
  if (!userId || typeof userId !== 'string') {
    throw new Error('User data missing required ID field');
  }
  if (!userData.email || typeof userData.email !== 'string') {
    throw new Error('User data missing required email field');
  }
  return {
    id: userId,
    name: userData.name || '',
    org: orgId,
    email: userData.email,
    emailVerified: true,
    clientId,
    role: userData.role || '',
    image: userData.image,
  };
}

export function createSession(user: AuthUser, sessionId: string): AuthSession {
  return {
    user,
    sessionId,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
