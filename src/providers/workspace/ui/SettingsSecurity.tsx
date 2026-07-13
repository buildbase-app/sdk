import { Check, KeyRound, Pencil, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { IPasskeySummary } from '../../../api/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';
import { Input } from '../../../components/ui/input';
import { SectionHeader } from '../../../components/ui/section-header';
import { useUIVisibility } from '../../../hooks/useUIVisibility';
import { useTranslation } from '../../../i18n';
import { handleError } from '../../../lib/error-handler';
import { formatDate } from '../../../lib/format-utils';
import { useWorkspaceApiWithOs } from '../use-workspace-api';
import SettingSkeleton from './Skeleton';

const WorkspaceSettingsSecurity: React.FC = () => {
  const { t, formattingLocale } = useTranslation();
  const { visible, ui } = useUIVisibility();
  const dateFormat = ui.formats?.date ?? { dateStyle: 'medium' as const };
  const canRename = visible(ui => ui.settings?.security?.passkeyRename);
  const canDelete = visible(ui => ui.settings?.security?.passkeyDelete);
  const { api } = useWorkspaceApiWithOs();
  const [loading, setLoading] = useState(true);
  const [passkeys, setPasskeys] = useState<IPasskeySummary[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await api.getPasskeys();
      setPasskeys(list);
    } catch (error) {
      handleError(error, { component: 'WorkspaceSettingsSecurity' });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function rename(id: string) {
    const name = editingName.trim();
    if (!name) return;
    setBusyId(id);
    try {
      await api.renamePasskey(id, name);
      setPasskeys(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));
      setEditingId(null);
    } catch (error) {
      handleError(error, { component: 'WorkspaceSettingsSecurity' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await api.deletePasskey(id);
      setPasskeys(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      handleError(error, { component: 'WorkspaceSettingsSecurity' });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <SettingSkeleton />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('security.passkeysTitle')}
        description={t('security.passkeysDescription')}
      />

      {passkeys.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-5 w-5 text-muted-foreground" />}
          description={t('security.noPasskeys')}
        />
      ) : (
        <div className="space-y-2">
          {passkeys.map(passkey => (
            <div
              key={passkey.id}
              className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                passkey.active === false ? 'opacity-70' : ''
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  {editingId === passkey.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        placeholder={t('security.renamePlaceholder')}
                        className="h-8"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 sm:h-8 sm:w-8 shrink-0"
                        disabled={busyId === passkey.id}
                        onClick={() => rename(passkey.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 sm:h-8 sm:w-8 shrink-0"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{passkey.name}</p>
                        {passkey.active === false && (
                          <span
                            className="shrink-0 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
                            title={t('security.inactiveHint')}
                          >
                            {t('security.inactive')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {passkey.active === false
                          ? t('security.inactiveHint')
                          : passkey.lastUsedAt
                            ? `${t('security.lastUsed')}: ${formatDate(passkey.lastUsedAt, formattingLocale, dateFormat)}`
                            : passkey.createdAt
                              ? `${t('security.added')}: ${formatDate(passkey.createdAt, formattingLocale, dateFormat)}`
                              : null}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {editingId !== passkey.id && (canRename || canDelete) && (
                <div className="flex shrink-0 items-center gap-1">
                  {canRename && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 sm:h-8 sm:w-8"
                      aria-label={t('security.rename')}
                      onClick={() => {
                        setEditingId(passkey.id);
                        setEditingName(passkey.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 sm:h-8 sm:w-8 text-destructive"
                          aria-label={t('security.remove')}
                          disabled={busyId === passkey.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('security.removeTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('security.removeDescription')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('settings.common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(passkey.id)}>
                            {t('security.remove')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t('security.addHint')}</p>
    </div>
  );
};

export default WorkspaceSettingsSecurity;
