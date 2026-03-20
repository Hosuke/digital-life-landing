import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiClient, ApiError, fileToDataUrl } from '../lib/api';
import { readConfig } from '../lib/config';
import { clearSnapshot, loadSnapshot, saveSnapshot } from '../lib/storage';
import type {
  ApplyPayload,
  MediaTaskView,
  OptimisticMessage,
  SessionSnapshot,
  WebDemoSessionResponse,
  WebDemoView
} from '../lib/types';
import { ChatTimeline } from './ChatTimeline';
import { Composer } from './Composer';
import { PaywallPanel } from './PaywallPanel';
import { SessionBootstrap } from './SessionBootstrap';
import { StatusBar } from './StatusBar';
import { UploadTray } from './UploadTray';

function hasActiveTasks(tasks: MediaTaskView[] = []): boolean {
  return tasks.some((t) => t.status === 'queued' || t.status === 'progress' || t.status === 'retrying');
}

function phaseGroup(phase = ''): string {
  const v = String(phase || '').trim();
  if (v === 'live') return 'live';
  if (v === 'locking' || v === 'ready_to_boot') return 'awakening';
  return 'onboarding';
}

function mergeWebDemo(base: WebDemoView | null, tasks: MediaTaskView[] | null): WebDemoView | null {
  if (!base) return null;
  return { ...base, pendingMediaTasks: tasks && tasks.length ? tasks : base.pendingMediaTasks };
}

export function AppShell() {
  const queryClient = useQueryClient();
  const config = useMemo(() => readConfig(), []);

  const [localSnapshot, setLocalSnapshot] = useState<SessionSnapshot | null>(() => loadSnapshot());
  const [uid, setUid] = useState(localSnapshot?.uid || '');
  const [clientToken, setClientToken] = useState(localSnapshot?.clientToken || '');
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Restore panel state
  const [showRestore, setShowRestore] = useState(false);
  const [restoreUid, setRestoreUid] = useState('');
  const [restoreToken, setRestoreToken] = useState('');

  const api = useMemo(() => createApiClient({
    baseUrl: config.controlPlaneBaseUrl,
    uid,
    clientToken
  }), [clientToken, config.controlPlaneBaseUrl, uid]);

  const hasSession = Boolean(uid && clientToken);

  // ---- Queries ----
  const sessionQuery = useQuery({
    queryKey: ['web-demo-session', uid, clientToken],
    enabled: hasSession,
    queryFn: () => api.getSession(),
    refetchInterval: (query) => {
      const wd = (query.state.data as { webDemo?: WebDemoView } | undefined)?.webDemo;
      if (!hasSession) return false;
      return hasActiveTasks(wd?.pendingMediaTasks || []) ? 2500 : 5000;
    }
  });

  const mediaQuery = useQuery({
    queryKey: ['web-demo-media', uid, clientToken],
    enabled: hasSession,
    queryFn: () => api.getMediaTasks(),
    refetchInterval: hasSession ? 3000 : false
  });

  const webDemo = useMemo(() => {
    if (!hasSession) return null;
    const fallback = localSnapshot?.uid === uid && localSnapshot?.clientToken === clientToken
      ? localSnapshot.lastWebDemo
      : null;
    const current = sessionQuery.data?.webDemo || fallback || null;
    return mergeWebDemo(current, mediaQuery.data?.tasks || null);
  }, [hasSession, clientToken, localSnapshot, mediaQuery.data?.tasks, sessionQuery.data?.webDemo, uid]);

  const phase = webDemo?.phase || (hasSession ? 'discovery' : '');

  // Persist to localStorage
  useEffect(() => {
    if (uid && clientToken) {
      saveSnapshot(uid, clientToken, webDemo);
      setLocalSnapshot({ uid, clientToken, lastWebDemo: webDemo });
    }
  }, [clientToken, uid, webDemo]);

  // ---- Connect session helper ----
  const connectSession = (nextUid: string, nextToken: string, data?: WebDemoSessionResponse | null) => {
    setUid(nextUid);
    setClientToken(nextToken);
    setOptimisticMessages([]);
    setErrorMsg(null);
    setShowRestore(false);
    if (data) {
      queryClient.setQueryData(['web-demo-session', nextUid, nextToken], data);
      saveSnapshot(nextUid, nextToken, data.webDemo || null);
      setLocalSnapshot({ uid: nextUid, clientToken: nextToken, lastWebDemo: data.webDemo || null });
    }
  };

  // ---- Mutations ----
  const applyMutation = useMutation({
    mutationFn: (payload: ApplyPayload) => api.apply(payload),
    onSuccess: (data) => {
      connectSession(data.uid, data.clientToken, data as unknown as WebDemoSessionResponse);
    },
    onError: (error) => {
      setErrorMsg(`创建失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ uid: rUid, clientToken: rToken }: { uid: string; clientToken: string }) => {
      const restoreApi = createApiClient({ baseUrl: config.controlPlaneBaseUrl, uid: rUid, clientToken: rToken });
      const data = await restoreApi.getSession();
      return { ...data, clientToken: rToken };
    },
    onSuccess: (data) => {
      connectSession(data.uid, data.clientToken, data);
    },
    onError: (error) => {
      setErrorMsg(`恢复失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => api.sendMessage(text),
    onSuccess: (data) => {
      setOptimisticMessages([]);
      setErrorMsg(null);
      queryClient.setQueryData(['web-demo-session', uid, clientToken], data);
    },
    onError: async (error) => {
      setOptimisticMessages([]);
      if (error instanceof ApiError && error.message === 'trial_limit_reached') {
        setErrorMsg(`试用上限已到。联系微信 ${config.manualSchedulingWechat} 继续体验。`);
      } else {
        setErrorMsg(`发送失败：${error instanceof Error ? error.message : '未知错误'}`);
      }
      await queryClient.invalidateQueries({ queryKey: ['web-demo-session', uid, clientToken] });
    }
  });

  const retryMutation = useMutation({
    mutationFn: (taskId: string) => api.retryTask(taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['web-demo-media', uid, clientToken] });
      await queryClient.invalidateQueries({ queryKey: ['web-demo-session', uid, clientToken] });
    },
    onError: (error) => {
      setErrorMsg(`重试失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ kind, file }: { kind: 'photo' | 'audio'; file: File }) => {
      const data = await fileToDataUrl(file);
      return api.uploadAsset(kind, { data, mimeType: file.type, originalName: file.name });
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(['web-demo-session', uid, clientToken], data);
      await queryClient.invalidateQueries({ queryKey: ['web-demo-media', uid, clientToken] });
      setErrorMsg(null);
    },
    onError: (error, variables) => {
      setErrorMsg(`${variables.kind === 'photo' ? '照片' : '音频'}上传失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  // ---- Actions ----
  const sendText = async (text: string) => {
    setOptimisticMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', text, at: new Date().toISOString(), pending: true }
    ]);
    setErrorMsg(null);
    await sendMutation.mutateAsync(text);
  };

  const resetSession = () => {
    setUid('');
    setClientToken('');
    setOptimisticMessages([]);
    setErrorMsg(null);
    clearSnapshot();
    setLocalSnapshot(null);
    queryClient.clear();
  };

  const disabledForChat = !hasSession || Boolean(webDemo?.paywallLocked) || phase === 'locking';
  const hasLocalCache = Boolean(localSnapshot?.uid && localSnapshot?.clientToken);

  // ---- Auto-restore from local cache on mount ----
  useEffect(() => {
    if (hasLocalCache && !hasSession) {
      const snap = loadSnapshot();
      if (snap) {
        void restoreMutation.mutateAsync({ uid: snap.uid, clientToken: snap.clientToken });
      }
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={`app app--${phaseGroup(phase)}`}>
      {/* Header */}
      <header className="app__header">
        <div>
          <p className="app__eyebrow">Amberify 珀存</p>
          <h1 className="app__title">数字生命体验</h1>
        </div>
        {hasSession && (
          <button type="button" className="ghost-btn ghost-btn--sm" onClick={resetSession}>
            重新开始
          </button>
        )}
      </header>

      <div className="app__layout">
        {/* Left column: form + status */}
        <aside className="app__sidebar">
          {!hasSession ? (
            <>
              <SessionBootstrap
                busy={applyMutation.isPending}
                onSubmit={async (payload) => { await applyMutation.mutateAsync(payload); }}
              />

              <div className="restore-section">
                <button type="button" className="toggle-btn" onClick={() => setShowRestore(!showRestore)}>
                  {showRestore ? '收起找回面板 \u25B2' : '找回已有角色 \u25BC'}
                </button>
                {showRestore && (
                  <div className="restore-form">
                    {hasLocalCache && (
                      <button
                        type="button"
                        className="primary-btn primary-btn--block"
                        disabled={restoreMutation.isPending}
                        onClick={() => {
                          const snap = loadSnapshot();
                          if (snap) void restoreMutation.mutateAsync({ uid: snap.uid, clientToken: snap.clientToken });
                        }}
                      >
                        {restoreMutation.isPending ? '恢复中...' : '恢复本机缓存'}
                      </button>
                    )}
                    <label className="form-field">
                      <span className="form-field__label">UID</span>
                      <input value={restoreUid} onChange={(e) => setRestoreUid(e.target.value)} placeholder="粘贴 UID" />
                    </label>
                    <label className="form-field">
                      <span className="form-field__label">Client Token</span>
                      <input value={restoreToken} onChange={(e) => setRestoreToken(e.target.value)} placeholder="粘贴 Token" />
                    </label>
                    <button
                      type="button"
                      className="primary-btn primary-btn--block"
                      disabled={restoreMutation.isPending || !restoreUid.trim() || !restoreToken.trim()}
                      onClick={() => void restoreMutation.mutateAsync({ uid: restoreUid.trim(), clientToken: restoreToken.trim() })}
                    >
                      {restoreMutation.isPending ? '恢复中...' : '手动找回'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <StatusBar uid={uid} webDemo={webDemo} />
              <UploadTray
                disabled={!hasSession}
                busy={uploadMutation.isPending}
                onPhotoUpload={async (file) => { await uploadMutation.mutateAsync({ kind: 'photo', file }); }}
                onAudioUpload={async (file) => { await uploadMutation.mutateAsync({ kind: 'audio', file }); }}
              />
              <PaywallPanel
                visible={Boolean(webDemo?.paywallLocked)}
                wechat={config.manualSchedulingWechat}
                qq={config.manualSchedulingQq}
                email={config.paidContactEmail}
              />
            </>
          )}

          {/* Error banner */}
          {errorMsg && (
            <div className="error-banner">
              <span>{errorMsg}</span>
              <button type="button" className="error-banner__close" onClick={() => setErrorMsg(null)}>&times;</button>
            </div>
          )}
        </aside>

        {/* Right column: chat */}
        <section className="app__chat">
          <div className="chat-shell">
            <ChatTimeline
              webDemo={webDemo}
              optimisticMessages={optimisticMessages}
              uid={uid}
              clientToken={clientToken}
              onRetryTask={(taskId) => retryMutation.mutate(taskId)}
              retryDisabled={retryMutation.isPending}
              isSending={sendMutation.isPending}
            />
          </div>
          <Composer
            disabled={disabledForChat}
            busy={sendMutation.isPending}
            phase={phase}
            onSend={sendText}
          />
        </section>
      </div>
    </main>
  );
}
