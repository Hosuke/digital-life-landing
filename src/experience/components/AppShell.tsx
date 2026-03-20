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
import { LiveChatThread } from './LiveChatThread';
import { MediaTaskFeed } from './MediaTaskFeed';
import { PaywallPanel } from './PaywallPanel';
import { RestoreSessionPanel } from './RestoreSessionPanel';
import { SessionAccessCard } from './SessionAccessCard';
import { SessionBootstrap } from './SessionBootstrap';
import { StatusBar } from './StatusBar';
import { UploadTray } from './UploadTray';

type EntryMode = 'landing' | 'new' | 'restore';

interface PhaseMeta {
  label: string;
  title: string;
  summary: string;
  checklist: string[];
}

function hasActiveTasks(tasks: MediaTaskView[] = []): boolean {
  return tasks.some((task) => task.status === 'queued' || task.status === 'progress' || task.status === 'retrying');
}

function phaseMeta(phase = ''): PhaseMeta {
  const value = String(phase || '').trim();
  if (value === 'asset_intake') {
    return {
      label: '等待素材',
      title: '还差让 TA 更像本人的素材',
      summary: '继续聊天补档也可以，但现在最关键的是一张正面照。音频不是必需，没有音频时会先按画像匹配默认声线。',
      checklist: ['上传 1 张清晰正面照', '可选上传 1 段音频', '不用重复发模板，像平时聊天那样补充就够了']
    };
  }
  if (value === 'ready_to_boot') {
    return {
      label: '准备启动',
      title: '资料已经够了，系统会开始锁定角色',
      summary: '现在不需要再重复说明。系统会把当前建档信息整理为角色设定，并准备进入 live。',
      checklist: ['等待系统锁定角色', '保持当前页面打开', '几秒后会自动进入 live']
    };
  }
  if (value === 'locking') {
    return {
      label: '正在唤醒',
      title: 'TA 正在被唤醒',
      summary: '这一段时间里输入会暂时收紧。等角色初始化完成后，界面会切换到 live，聊天语气也会从建档采集转成角色本人。',
      checklist: ['等待初始化完成', '不要重复发多条催促消息', '准备进入 live 对话']
    };
  }
  if (value === 'live') {
    return {
      label: '已进入 live',
      title: '现在已经是角色本人在回复',
      summary: '建档阶段已经结束。接下来应当像普通聊天一样交流，图片、语音、视频会作为媒体任务陆续回填。',
      checklist: ['直接聊天，不再填表', '可以索要照片、语音、视频', '若刷新页面，可用本机缓存或 UID + 令牌找回']
    };
  }
  return {
    label: '建档采集',
    title: '先让系统理解你想留住的是谁',
    summary: '这一阶段不是“角色本人”在说话，而是建档代理在温和地整理信息。继续自然描述 TA 是谁、怎么说话、你们之间的记忆。',
    checklist: ['补充 TA 的身份与关系', '补充 TA 的说话风格', '完成后上传照片进入下一阶段']
  };
}

function phaseClassName(phase = ''): string {
  const value = String(phase || '').trim();
  if (value === 'live') return 'live';
  if (value === 'locking' || value === 'ready_to_boot') return 'awakening';
  return 'onboarding';
}

function buildStatusHint(webDemo: WebDemoView | null, wechat: string, email: string): string {
  if (!webDemo) return '先创建一个体验会话，或找回你之前已经建立过的角色。';
  if (webDemo.paywallLocked) return `试用已结束。继续体验请联系微信 ${wechat} 或邮件 ${email}。`;
  if (webDemo.phase === 'discovery') return '当前是建档阶段。你看到的是采集代理，不是角色本人。继续自然补充 TA 的身份、说话风格和你们之间的记忆。';
  if (webDemo.phase === 'asset_intake') return '当前最关键的是一张正面照。若没有音频，也可以先用默认声线继续推进。';
  if (webDemo.phase === 'ready_to_boot') return '资料已经够了，系统会自动把 TA 锁定并准备唤醒。';
  if (webDemo.phase === 'locking') return '角色正在唤醒。等几秒，界面会切换到 live。';
  return '现在已经进入 live。后续回复应视为角色本人。你可以继续聊天，或直接要求照片、语音、视频。';
}

function mergeWebDemo(base: WebDemoView | null, tasks: MediaTaskView[] | null): WebDemoView | null {
  if (!base) return null;
  return {
    ...base,
    pendingMediaTasks: tasks && tasks.length ? tasks : base.pendingMediaTasks
  };
}

function nextSessionSnapshot(uid: string, clientToken: string, webDemo: WebDemoView | null): SessionSnapshot {
  return { uid, clientToken, lastWebDemo: webDemo };
}

export function AppShell() {
  const queryClient = useQueryClient();
  const config = useMemo(() => readConfig(), []);
  const [localSnapshot, setLocalSnapshot] = useState<SessionSnapshot | null>(() => loadSnapshot());
  const [uid, setUid] = useState(localSnapshot?.uid || '');
  const [clientToken, setClientToken] = useState(localSnapshot?.clientToken || '');
  const [entryMode, setEntryMode] = useState<EntryMode>(localSnapshot ? 'restore' : 'landing');
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [inlineState, setInlineState] = useState(localSnapshot ? '正在恢复上次体验会话...' : '请选择开始新体验，或找回你之前的角色。');

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
    const snapshotFallback = localSnapshot?.uid === uid && localSnapshot?.clientToken === clientToken
      ? localSnapshot.lastWebDemo
      : null;
    const current = sessionQuery.data?.webDemo || snapshotFallback || null;
    return mergeWebDemo(current, mediaTasksQuery.data?.tasks || null);
  }, [clientToken, localSnapshot, mediaTasksQuery.data?.tasks, sessionQuery.data?.webDemo, uid]);

  useEffect(() => {
    if (uid && clientToken) {
      const snapshot = nextSessionSnapshot(uid, clientToken, webDemo);
      saveSnapshot(snapshot.uid, snapshot.clientToken, snapshot.lastWebDemo);
      setLocalSnapshot(snapshot);
    }
  }, [clientToken, uid, webDemo]);

  useEffect(() => {
    if (sessionQuery.isSuccess) {
      setInlineState(buildStatusHint(sessionQuery.data.webDemo, config.manualSchedulingWechat, config.paidContactEmail));
    }
  }, [config.manualSchedulingWechat, config.paidContactEmail, sessionQuery.data, sessionQuery.isSuccess]);

  const connectSession = async (nextUid: string, nextClientToken: string, nextData?: WebDemoSessionResponse | null, nextMessage?: string) => {
    setUid(nextUid);
    setClientToken(nextClientToken);
    setOptimisticMessages([]);
    setEntryMode('landing');
    if (nextData) {
      queryClient.setQueryData(['web-demo-session', nextUid, nextClientToken], nextData);
      const snapshot = nextSessionSnapshot(nextUid, nextClientToken, nextData.webDemo || null);
      saveSnapshot(snapshot.uid, snapshot.clientToken, snapshot.lastWebDemo);
      setLocalSnapshot(snapshot);
    }
    setInlineState(nextMessage || '会话已恢复。');
  };

  const applyMutation = useMutation({
    mutationFn: (payload: ApplyPayload) => api.apply(payload),
    onSuccess: async (data) => {
      await connectSession(data.uid, data.clientToken, data as unknown as WebDemoSessionResponse, '体验会话已建立。当前先由建档代理收集信息，完成后会进入角色 live。');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'create_failed';
      setInlineState(`创建失败：${message}`);
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ uid: nextUid, clientToken: nextClientToken }: { uid: string; clientToken: string }) => {
      const restoreApi = createApiClient({
        baseUrl: config.controlPlaneBaseUrl,
        uid: nextUid,
        clientToken: nextClientToken
      });
      const data = await restoreApi.getSession();
      return { ...data, clientToken: nextClientToken };
    },
    onSuccess: async (data) => {
      await connectSession(data.uid, data.clientToken, data, '会话已恢复。若之前已经进入 live，现在会直接回到角色聊天。');
    },
    onError: (error) => {
      setInlineState(`恢复失败：${error instanceof Error ? error.message : 'unknown_error'}`);
    }
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => api.sendMessage(text),
    onSuccess: (data) => {
      setOptimisticMessages([]);
      queryClient.setQueryData(['web-demo-session', uid, clientToken], data);
      setInlineState(data.reply?.chunks?.length ? '已收到回复。若触发媒体任务，图片、语音、视频会继续回填到时间线。' : '消息已处理。');
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
        setInlineState('参考图已接收。若文字信息已经够，系统会自动进入唤醒阶段。');
      } else {
        setInlineState('音频已接收。后续会优先使用这段素材的音色；若没有音频，也会按画像匹配默认声线。');
      }
    },
    onError: (error, variables) => {
      setInlineState(`${variables.kind === 'photo' ? '照片' : '音频'}上传失败：${error instanceof Error ? error.message : 'unknown_error'}`);
    }
  });

  const hasSession = Boolean(uid && clientToken);
  const phase = webDemo?.phase || (hasSession ? 'discovery' : 'landing');
  const currentPhaseMeta = phaseMeta(phase);
  const disabledForChat = !uid || !clientToken || Boolean(webDemo?.paywallLocked) || phase === 'locking';
  const hasLocalSnapshot = Boolean(localSnapshot?.uid && localSnapshot?.clientToken);

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

  const resetLocalSession = () => {
    setUid('');
    setClientToken('');
    setOptimisticMessages([]);
    setEntryMode('landing');
    clearSnapshot();
    setLocalSnapshot(null);
    queryClient.clear();
    setInlineState('本地会话已清除。你可以重新创建体验，或手动找回旧角色。');
  };

  return (
    <main className={`experience-app experience-app--${phaseClassName(phase)}`}>
      <section className="experience-hero">
        <div>
          <p className="eyebrow">Amberify 珀存</p>
          <h1>网页体验工作台</h1>
          <p className="hero-copy">这版界面明确区分三种状态：建档采集、角色唤醒、进入 live。建档阶段是代理在整理资料，live 阶段才是角色本人在交流。</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="ghost-btn" onClick={() => setEntryMode('new')} disabled={applyMutation.isPending || restoreMutation.isPending}>
            开始新体验
          </button>
          <button type="button" className="ghost-btn" onClick={() => setEntryMode('restore')} disabled={applyMutation.isPending || restoreMutation.isPending}>
            找回已有角色
          </button>
        </div>
      </section>

      {!hasSession ? (
        <section className="entry-layout">
          <div className="entry-panel panel-card">
            <p className="entry-kicker">体验入口</p>
            <h2>{entryMode === 'restore' ? '找回已有角色' : entryMode === 'new' ? '开始一轮新的体验' : '先选择这次要做什么'}</h2>
            <p className="panel-copy">当前版本先用访客恢复：同一设备可直接恢复本机会话；跨设备则用 <code>UID + clientToken</code> 找回。正式版再升级为账号体系。</p>
            <div className="entry-choices">
              <button type="button" className={`entry-choice${entryMode === 'new' ? ' is-active' : ''}`} onClick={() => setEntryMode('new')}>
                <strong>开始新体验</strong>
                <span>先创建一个角色体验，再上传照片或音频。</span>
              </button>
              <button type="button" className={`entry-choice${entryMode === 'restore' ? ' is-active' : ''}`} onClick={() => setEntryMode('restore')}>
                <strong>找回已有角色</strong>
                <span>恢复你上次已经建好的角色，不必重新采集。</span>
              </button>
            </div>
            {hasLocalSnapshot ? <p className="entry-footnote">本机检测到上次体验缓存，可直接恢复。</p> : null}
          </div>

          <div className="entry-panel entry-panel--form">
            {entryMode === 'restore' ? (
              <RestoreSessionPanel
                busy={restoreMutation.isPending}
                hasLocalSnapshot={hasLocalSnapshot}
                onRestore={async (nextUid, nextClientToken) => {
                  await restoreMutation.mutateAsync({ uid: nextUid, clientToken: nextClientToken });
                }}
                onUseLocalSnapshot={async () => {
                  if (!localSnapshot) return;
                  await restoreMutation.mutateAsync({ uid: localSnapshot.uid, clientToken: localSnapshot.clientToken });
                }}
              />
            ) : (
              <SessionBootstrap
                busy={applyMutation.isPending}
                onSubmit={async (payload) => {
                  await applyMutation.mutateAsync(payload);
                }}
              />
            )}
            <div className="panel-card panel-card--hint">{inlineState}</div>
          </div>
        </section>
      ) : (
        <section className={`experience-grid${phase === 'live' ? ' experience-grid--live' : ''}`}>
          <aside className="side-panel side-panel--stack">
            <section className="phase-card panel-card">
              <p className="entry-kicker">当前阶段</p>
              <h2>{currentPhaseMeta.title}</h2>
              <p className="panel-copy">{currentPhaseMeta.summary}</p>
              <ul className="phase-checklist">
                {currentPhaseMeta.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <SessionAccessCard uid={uid} clientToken={clientToken} />
            <div className="toolbar-row toolbar-row--stack">
              <button type="button" className="ghost-btn" onClick={resetLocalSession}>
                新建 / 找回其他角色
              </button>
            </div>
          </aside>

          <section className="chat-panel">
            <StatusBar uid={uid} webDemo={webDemo} />
            <div className={`panel-card panel-card--hint panel-card--phase-${phaseClassName(phase)}`}>
              {inlineState}
            </div>
            <UploadTray
              disabled={!uid || !clientToken || uploadMutation.isPending}
              onInlineState={setInlineState}
              onPhotoUpload={async (file) => { await uploadMutation.mutateAsync({ kind: 'photo', file }); }}
              onAudioUpload={async (file) => { await uploadMutation.mutateAsync({ kind: 'audio', file }); }}
            />
            {phase === 'live' ? (
              <div className="live-workspace">
                <div className="timeline-shell timeline-shell--assistant">
                  <LiveChatThread
                    key={`${uid}:${clientToken}`}
                    baseUrl={config.controlPlaneBaseUrl}
                    uid={uid}
                    clientToken={clientToken}
                    webDemo={webDemo}
                    onInlineState={setInlineState}
                    onSessionUpdate={(data) => {
                      queryClient.setQueryData(['web-demo-session', uid, clientToken], data);
                      void queryClient.invalidateQueries({ queryKey: ['web-demo-media', uid, clientToken] });
                    }}
                  />
                </div>
                <MediaTaskFeed
                  tasks={webDemo?.pendingMediaTasks || []}
                  uid={uid}
                  clientToken={clientToken}
                  onRetryTask={(taskId) => retryMutation.mutate(taskId)}
                  retryDisabled={retryMutation.isPending}
                />
              </div>
            ) : (
              <>
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
                  phase={phase}
                  onSend={sendText}
                  onReuseLast={async () => {
                    if (!lastUserMessage) return;
                    await sendText(lastUserMessage);
                  }}
                />
              </>
            )}
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
                onClick={resetLocalSession}
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
      )}
    </main>
  );
}
