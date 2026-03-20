import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiClient, ApiError, fileToDataUrl } from '../lib/api';
import { readConfig } from '../lib/config';
import { clearSnapshot, loadSnapshot, saveSnapshot } from '../lib/storage';
import type { ApplyPayload, MediaTaskView, OptimisticMessage, WebDemoView } from '../lib/types';
import { ChatTimeline } from './ChatTimeline';
import { Composer } from './Composer';
import { PaywallPanel } from './PaywallPanel';
import { SessionBootstrap } from './SessionBootstrap';
import { StatusBar } from './StatusBar';
import { UploadTray } from './UploadTray';

function hasActiveTasks(tasks: MediaTaskView[] = []): boolean {
  return tasks.some((task) => task.status === 'queued' || task.status === 'progress' || task.status === 'retrying');
}

function buildStatusHint(webDemo: WebDemoView | null, wechat: string, email: string): string {
  if (!webDemo) return '先填写左侧表单，系统会为这次体验分配 UID 和会话令牌。';
  if (webDemo.paywallLocked) return `试用已结束。继续体验请联系微信 ${wechat} 或邮件 ${email}。`;
  if (webDemo.phase === 'discovery') return '继续用自然语言描述 TA。像聊天一样补充：TA 是谁、TA 怎么说话、你们之间的记忆。';
  if (webDemo.phase === 'asset_intake') return '现在最关键的是一张正面照。音频不是必需，但有的话会更像 TA。';
  if (webDemo.phase === 'ready_to_boot') return '资料已经够了，系统会自动把 TA 启动起来。';
  if (webDemo.phase === 'locking') return '角色正在被唤醒。先不用重复发消息，几秒后就会进入 live。';
  return '现在已经进入 live。你可以继续像平时那样聊天，也可以直接要照片、语音或视频。';
}

function mergeWebDemo(base: WebDemoView | null, tasks: MediaTaskView[] | null): WebDemoView | null {
  if (!base) return null;
  return {
    ...base,
    pendingMediaTasks: tasks && tasks.length ? tasks : base.pendingMediaTasks
  };
}

export function AppShell() {
  const queryClient = useQueryClient();
  const config = useMemo(() => readConfig(), []);
  const initialSnapshot = useMemo(() => loadSnapshot(), []);
  const [uid, setUid] = useState(initialSnapshot?.uid || '');
  const [clientToken, setClientToken] = useState(initialSnapshot?.clientToken || '');
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [inlineState, setInlineState] = useState(initialSnapshot ? '正在恢复上次体验会话...' : '尚未连接到体验会话。');

  const api = useMemo(() => createApiClient({
    baseUrl: config.controlPlaneBaseUrl,
    uid,
    clientToken
  }), [clientToken, config.controlPlaneBaseUrl, uid]);

  const sessionQuery = useQuery({
    queryKey: ['web-demo-session', uid, clientToken],
    enabled: Boolean(uid && clientToken),
    queryFn: () => api.getSession(),
    refetchInterval: (query) => {
      const webDemo = (query.state.data as { webDemo?: WebDemoView } | undefined)?.webDemo;
      if (!uid || !clientToken) return false;
      return hasActiveTasks(webDemo?.pendingMediaTasks || []) ? 2500 : 4000;
    }
  });

  const mediaTasksQuery = useQuery({
    queryKey: ['web-demo-media', uid, clientToken],
    enabled: Boolean(uid && clientToken),
    queryFn: () => api.getMediaTasks(),
    refetchInterval: uid && clientToken ? 2500 : false
  });

  const webDemo = useMemo(() => {
    if (!uid || !clientToken) return null;
    const snapshotFallback = initialSnapshot?.uid === uid && initialSnapshot?.clientToken === clientToken
      ? initialSnapshot.lastWebDemo
      : null;
    const current = sessionQuery.data?.webDemo || snapshotFallback || null;
    return mergeWebDemo(current, mediaTasksQuery.data?.tasks || null);
  }, [clientToken, initialSnapshot?.clientToken, initialSnapshot?.lastWebDemo, initialSnapshot?.uid, mediaTasksQuery.data?.tasks, sessionQuery.data?.webDemo, uid]);

  useEffect(() => {
    if (uid && clientToken) {
      saveSnapshot(uid, clientToken, webDemo);
    }
  }, [clientToken, uid, webDemo]);

  useEffect(() => {
    if (sessionQuery.isSuccess) {
      setInlineState(buildStatusHint(sessionQuery.data.webDemo, config.manualSchedulingWechat, config.paidContactEmail));
    }
  }, [config.manualSchedulingWechat, config.paidContactEmail, sessionQuery.data, sessionQuery.isSuccess]);

  const applyMutation = useMutation({
    mutationFn: (payload: ApplyPayload) => api.apply(payload),
    onSuccess: (data) => {
      setUid(data.uid);
      setClientToken(data.clientToken);
      setInlineState('体验会话已建立。现在可以继续补充信息，或直接上传照片启动。');
      queryClient.setQueryData(['web-demo-session', data.uid, data.clientToken], data);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'create_failed';
      setInlineState(`创建失败：${message}`);
    }
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => api.sendMessage(text),
    onSuccess: (data) => {
      setOptimisticMessages([]);
      queryClient.setQueryData(['web-demo-session', uid, clientToken], data);
      setInlineState(data.reply?.chunks?.length ? '已收到回复。若需要图片、语音或视频，系统会继续在这里回填。' : '消息已处理。');
    },
    onError: async (error) => {
      setOptimisticMessages([]);
      if (error instanceof ApiError && error.message === 'trial_limit_reached') {
        setInlineState(`试用上限已到。请联系微信 ${config.manualSchedulingWechat} 或邮件 ${config.paidContactEmail}。`);
      } else {
        setInlineState(`发送失败：${error instanceof Error ? error.message : 'unknown_error'}`);
      }
      await queryClient.invalidateQueries({ queryKey: ['web-demo-session', uid, clientToken] });
    }
  });

  const retryMutation = useMutation({
    mutationFn: (taskId: string) => api.retryTask(taskId),
    onSuccess: async () => {
      setInlineState('已重新发起媒体任务。');
      await queryClient.invalidateQueries({ queryKey: ['web-demo-media', uid, clientToken] });
      await queryClient.invalidateQueries({ queryKey: ['web-demo-session', uid, clientToken] });
    },
    onError: (error) => {
      setInlineState(`重试失败：${error instanceof Error ? error.message : 'unknown_error'}`);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ kind, file }: { kind: 'photo' | 'audio'; file: File }) => {
      const data = await fileToDataUrl(file);
      return api.uploadAsset(kind, {
        data,
        mimeType: file.type,
        originalName: file.name
      });
    },
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(['web-demo-session', uid, clientToken], data);
      await queryClient.invalidateQueries({ queryKey: ['web-demo-media', uid, clientToken] });
      if (variables.kind === 'photo') {
        setInlineState('参考图已接收。若文本信息已完整，系统会自动启动。');
      } else {
        setInlineState('音频已接收。后续生成语音会优先使用这段素材的音色。');
      }
    },
    onError: (error, variables) => {
      setInlineState(`${variables.kind === 'photo' ? '照片' : '音频'}上传失败：${error instanceof Error ? error.message : 'unknown_error'}`);
    }
  });

  const disabledForChat = !uid || !clientToken || Boolean(webDemo?.paywallLocked);

  const sendText = async (text: string) => {
    setLastUserMessage(text);
    setOptimisticMessages((current) => current.concat({
      id: `local-${Date.now()}`,
      role: 'user',
      text,
      at: new Date().toISOString(),
      pending: true
    }));
    setInlineState('消息已送出，正在等待回复...');
    await sendMutation.mutateAsync(text);
  };

  return (
    <main className="experience-app">
      <section className="experience-hero">
        <div>
          <p className="eyebrow">Amberify 珀存</p>
          <h1>网页聊天工作台</h1>
          <p className="hero-copy">这版体验以“媒体可靠性交付”为优先：只有图片、语音、视频真的可打开时，才会进入聊天时间线。</p>
        </div>
      </section>

      <section className="experience-grid">
        <aside className="side-panel">
          <SessionBootstrap busy={applyMutation.isPending} onSubmit={async (payload) => { await applyMutation.mutateAsync(payload); }} />
        </aside>

        <section className="chat-panel">
          <StatusBar uid={uid} webDemo={webDemo} />
          <div className="panel-card panel-card--hint">{inlineState}</div>
          <UploadTray
            disabled={!uid || !clientToken || uploadMutation.isPending}
            onInlineState={setInlineState}
            onPhotoUpload={async (file) => { await uploadMutation.mutateAsync({ kind: 'photo', file }); }}
            onAudioUpload={async (file) => { await uploadMutation.mutateAsync({ kind: 'audio', file }); }}
          />
          <div className="timeline-shell">
            <ChatTimeline
              webDemo={webDemo}
              optimisticMessages={optimisticMessages}
              uid={uid}
              clientToken={clientToken}
              inlineState={inlineState}
              onRetryTask={(taskId) => retryMutation.mutate(taskId)}
              retryDisabled={retryMutation.isPending}
            />
          </div>
          <Composer
            disabled={disabledForChat}
            busy={sendMutation.isPending}
            onSend={sendText}
            onReuseLast={async () => {
              if (!lastUserMessage) return;
              await sendText(lastUserMessage);
            }}
          />
          <div className="toolbar-row">
            <button
              type="button"
              className="ghost-btn"
              disabled={!uid || !clientToken}
              onClick={async () => {
                await queryClient.invalidateQueries({ queryKey: ['web-demo-session', uid, clientToken] });
                await queryClient.invalidateQueries({ queryKey: ['web-demo-media', uid, clientToken] });
                setInlineState('同步完成。');
              }}
            >
              手动同步
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setUid('');
                setClientToken('');
                setOptimisticMessages([]);
                clearSnapshot();
                queryClient.clear();
                setInlineState('本地会话已清除。你可以重新创建一轮体验。');
              }}
            >
              清除本地会话
            </button>
          </div>
          <PaywallPanel
            visible={Boolean(webDemo?.paywallLocked)}
            wechat={config.manualSchedulingWechat}
            qq={config.manualSchedulingQq}
            email={config.paidContactEmail}
          />
        </section>
      </section>
    </main>
  );
}
