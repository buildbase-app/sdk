import { SelectValue } from '@radix-ui/react-select';
import { useTranslation, type TranslationKey } from '../../../i18n';
import { Loader2, TrashIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { IUser } from '../../../api/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../../components/ui/select';
import { useSubscriptionContext } from '../../../contexts/SubscriptionContext';
import { useSeatStatus } from '../../../hooks/use-seat-status';
import { handleError } from '../../../lib/error-handler';
import { useSaaSAuth } from '../../auth/hooks';
import { useSaaSSettings } from '../../os/hooks';
import { useSaaSWorkspaces } from '../hooks';
import { IWorkspace, IWorkspaceUser } from '../types';
import { isWorkspaceOwner } from '../utils';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsUsers: React.FC<{ workspace: IWorkspace }> = ({ workspace }) => {
  const { user: currentUser } = useSaaSAuth();
  const { t, fmtNum, fmtCents } = useTranslation();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<IWorkspaceUser[]>([]);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const { getUsers, removeUser, updateUser } = useSaaSWorkspaces();
  const { settings } = useSaaSSettings();

  const { response: subscriptionResponse } = useSubscriptionContext();

  // Use the unified seat status hook — resolves limits from seat pricing, plan limits, and settings
  const seatStatus = useSeatStatus(workspace, {
    settingsMaxUsers: settings?.workspace?.maxWorkspaceUsers,
  });

  useEffect(() => {
    if (!workspace) return;
    setLoading(true);
    getUsers(workspace._id)
      .then(users => {
        setWorkspaceUsers(users);
      })
      .catch(error => {
        handleError(error, {
          component: 'WorkspaceSettingsUsers',
          action: 'getUsers',
          metadata: { workspaceId: workspace._id },
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspace, refreshCounter]);

  const refresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  if (loading || !workspace) {
    return <SettingSkeleton />;
  }

  // Helper function to get user display info
  const getUserDisplay = (user: string | IUser) => {
    if (typeof user === 'string') {
      return { name: t('users.unknownUser'), email: user, id: user, role: '-' };
    }
    return { name: user.name, email: user.email, id: user._id };
  };

  const finalUsers = workspaceUsers.map(user => ({
    ...user,
    ...getUserDisplay(user.user),
  }));

  const handleRemoveUser = (userId: string) => {
    // Check if user is the owner
    if (isWorkspaceOwner(workspace, userId)) {
      handleError(new Error('Cannot remove the workspace owner'), {
        component: 'WorkspaceSettingsUsers',
        action: 'handleRemoveUser',
        metadata: { workspaceId: workspace._id, userId },
      });
      return;
    }

    removeUser(workspace._id, userId)
      .then(() => {
        refresh();
      })
      .catch(error => {
        handleError(error, {
          component: 'WorkspaceSettingsUsers',
          action: 'handleRemoveUser',
          metadata: { workspaceId: workspace._id, userId },
        });
      });
  };

  const handleUpdateRole = (workspaceId: string, userId: string, role: string) => {
    // Check if user is the owner
    if (isWorkspaceOwner(workspace, userId)) {
      handleError(new Error('Cannot change the role of the workspace owner'), {
        component: 'WorkspaceSettingsUsers',
        action: 'handleUpdateRole',
        metadata: { workspaceId, userId, role },
      });
      return;
    }

    setUpdatingRoleUserId(userId);
    updateUser(workspaceId, userId, { role })
      .then(() => {
        refresh();
      })
      .catch(error => {
        handleError(error, {
          component: 'WorkspaceSettingsUsers',
          action: 'handleUpdateRole',
          metadata: { workspaceId, userId, role },
        });
      })
      .finally(() => {
        setUpdatingRoleUserId(null);
      });
  };

  const myRole = workspaceUsers.find(user => {
    const id = typeof user.user === 'string' ? user.user : user.user._id;
    return id === currentUser?.id;
  })?.role;

  const amIAdmin = myRole === 'admin';

  const {
    hasSeatPricing,
    includedSeats,
    maxUsers,
    canInvite,
    inviteBlockReason,
    inviteBlockMessageKey,
    inviteBlockMessageValues,
    perSeatPriceCents,
    currency,
  } = seatStatus;

  const currentUsersCount = workspaceUsers.length;
  const billingInterval: string = subscriptionResponse?.subscription?.billingInterval ?? 'monthly';
  const willBeBilled = hasSeatPricing && currentUsersCount >= includedSeats;

  return (
    <div>
      {!amIAdmin && (
        <div className="text-red-500">{t('users.adminOnly')}</div>
      )}

      {amIAdmin && settings?.workspace?.canInviteMembers !== false && (
        <div className="mb-4">
          {canInvite ? (
            <div>
              <InviteMember onInvite={refresh} workspaceId={workspace._id} />
              {willBeBilled && perSeatPriceCents && perSeatPriceCents > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
                  <span>{t('users.extraSeatCost', { price: fmtCents(perSeatPriceCents, currency), interval: billingInterval })}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-md">
              <div>
                <p className="text-sm font-medium text-red-700">
                  {t('users.limitReached', { reason: inviteBlockReason ?? 'member_limit_reached' })}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {inviteBlockMessageKey ? t(inviteBlockMessageKey as TranslationKey, inviteBlockMessageValues ?? undefined) : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Seat status card — shown for seat pricing OR plan-based limits */}
      {(hasSeatPricing || maxUsers > 0) && (
        <div className="mb-4 rounded-lg border bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">{t('users.seatHeading', { hasSeatPricing: String(hasSeatPricing) })}</h4>
            {maxUsers > 0 && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                currentUsersCount >= maxUsers
                  ? 'bg-red-100 text-red-700'
                  : currentUsersCount >= maxUsers * 0.8
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
              }`}>
                {fmtNum(currentUsersCount)} / {fmtNum(maxUsers)}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {maxUsers > 0 && (
            <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  currentUsersCount >= maxUsers
                    ? 'bg-red-500'
                    : currentUsersCount >= maxUsers * 0.8
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (currentUsersCount / maxUsers) * 100)}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {hasSeatPricing ? (
                <>
                  <span className="text-gray-900 font-medium">{fmtNum(includedSeats)}</span> {t('users.included')}
                  {perSeatPriceCents && perSeatPriceCents > 0 && (
                    <span className="text-gray-400"> · {fmtCents(perSeatPriceCents, currency)}{t('users.perExtraSeat')}</span>
                  )}
                </>
              ) : (
                <span>
                  <span className="text-gray-900 font-medium">{fmtNum(maxUsers)}</span> {t('users.maxMembers')}
                </span>
              )}
            </div>
            {maxUsers > 0 ? (
              <span>{fmtNum(Math.max(0, maxUsers - currentUsersCount))} {t('users.available')}</span>
            ) : (
              <span className="text-gray-400">{t('users.noMemberLimit')}</span>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">
            {t('users.memberCount', { count: currentUsersCount })}
          </div>
        </div>
        <div>
          <Button variant="ghost" size="sm" onClick={refresh} progress={loading}>
            {t('settings.common.refreshAction', { loading: String(loading) })}
          </Button>
        </div>
      </div>
      <ul className="space-y-2">
        {finalUsers.map((member, idx) => {
          const myself = member.id === currentUser?.id;
          const createdBy =
            typeof workspace.createdBy === 'object' && workspace.createdBy !== null
              ? workspace.createdBy._id
              : workspace.createdBy;
          const isOwner = createdBy === member.id;
          return (
            <li key={idx} className="border rounded p-3">
              <div className="flex items-center justify-between gap-2">
                {/* User info */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{member.name}</div>
                    <div className="text-xs text-gray-500 truncate">{member.email}</div>
                  </div>
                </div>

                {/* Badges — always visible */}
                <div className="flex items-center gap-1 shrink-0">
                  {myself && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{t('users.you')}</span>
                  )}
                  {isOwner && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{t('users.owner')}</span>
                  )}
                </div>
              </div>

              {/* Role + actions — second row on mobile, inline on desktop */}
              {amIAdmin && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 sm:mt-0 sm:pt-0 sm:border-0">
                  <div className="relative flex-1 sm:flex-initial">
                    <Select
                      disabled={myself || !amIAdmin || isOwner || updatingRoleUserId === member.id}
                      value={member.role}
                      onValueChange={value => handleUpdateRole(workspace._id, member.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('users.selectRole')} />
                      </SelectTrigger>
                      <SelectContent>
                        {workspace?.roles.map(role => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {updatingRoleUserId === member.id && (
                      <div className="absolute end-8 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      </div>
                    )}
                  </div>
                  {!myself && !isOwner && (
                    <Button
                      variant="destructive"
                      size="sm"
                      startIcon={<TrashIcon />}
                      onClick={() => handleRemoveUser(member.id)}
                    ></Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {workspaceUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">{t('users.noMembers')}</div>
      )}
    </div>
  );
};

function InviteMember({ onInvite, workspaceId }: { onInvite: () => void; workspaceId: string }) {
  const { t } = useTranslation();
  const { addUser, getWorkspace } = useSaaSWorkspaces();
  const { settings } = useSaaSSettings();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('admin');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const roles = settings?.workspace.roles ?? workspace?.roles ?? [];

  useEffect(() => {
    return () => { if (messageTimerRef.current) clearTimeout(messageTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    getWorkspace(workspaceId).then(setWorkspace);
  }, [workspaceId]);

  const handleInvite = async () => {
    const emailValue = email.trim();
    if (!emailValue) {
      setError(t('users.emailRequired'));
      return;
    }

    // check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // simple email validation
    if (!emailRegex.test(emailValue)) {
      setError(t('users.invalidEmail'));
      return;
    }

    setInviting(true);

    await addUser(workspaceId, emailValue, role)
      .then(() => {
        setSuccess(t('users.inviteSuccess'));
        onInvite?.();
      })
      .catch(error => {
        handleError(error, {
          component: 'InviteMember',
          action: 'addUser',
          metadata: { workspaceId, email: emailValue, role },
        });
        setError(error instanceof Error ? error.message : t('users.inviteFailed'));
      })
      .finally(() => {
        setInviting(false);

        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => {
          clearMessages();
        }, 6000);
      });
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setEmail('');
    setRole('admin');
  };

  return (
    <div className="flex gap-2 flex-col gap-y-2">
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-500">{success}</div>}
      <div>
        <Label>{t('users.inviteByEmail')}</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="example@example.com"
        />
      </div>
      <div>
        <Label>{t('users.role')}</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder={t('users.selectRole')} />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Button progress={inviting} onClick={handleInvite} disabled={inviting || !email || !role}>
          {inviting ? t('users.inviting') : t('users.inviteAs', { role })}
        </Button>
      </div>
    </div>
  );
}

export default WorkspaceSettingsUsers;
