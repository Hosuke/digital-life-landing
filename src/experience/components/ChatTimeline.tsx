import { useEffect, useRef } from 'react';
import type { MediaTaskView, OptimisticMessage, RecentMessage, WebDemoView } from '../lib/types';
import { MediaCard } from './MediaCard';
import { MessageBubble } from './MessageBubble';

interface ChatTimelineProps {
  webDemo: WebDemoView | null;
  optimisticMessages: OptimisticMessage[];
  uid: string;
  clientToken: string;
  onRetryTask: (taskId: string) => void;
  retryDisabled?: boolean;
  isSending?: boolean;
}

type TimelineItem =
  | { kind: 'message'; sortAt: number; key: string; payload: RecentMessage | OptimisticMessage }
  | { kind: 'task'; sortAt: number; key: string; payload: MediaTaskView };

function formatTime(at: string | null): string {
  if (!at) return '';
  const ts = Date.parse(String(at));
  if (!Number.isFinite(ts)) return '';
  return new Date(ts).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function messageMeta(message: RecentMessage | OptimisticMessage): string[] {
  const parts: string[] = [];
  if ('pending' in message && message.pending) parts.push('发送中');
  const time = formatTime(message.at);
  if (time) parts.push(time);
  return parts;
}

export function ChatTimeline({
  webDemo,
  optimisticMessages,
  uid,
  clientToken,
  onRetryTask,
  retryDisabled = false,
  isSending = false
}: ChatTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const timeline: TimelineItem[] = [];
  const messages = webDemo?.recentMessages || [];
  const tasks = webDemo?.pendingMediaTasks || [];

  messages.forEach((message, index) => {
    timeline.push({
      kind: 'message',
      sortAt: Date.parse(String(message.at || '')) || index,
      key: `msg-${index}-${message.at || 'none'}`,
      payload: message
    });
  });

  optimisticMessages.forEach((message, index) => {
    timeline.push({
      kind: 'message',
      sortAt: Date.parse(message.at) || Date.now() + index,
      key: message.id,
      payload: message
    });
  });

  tasks.forEach((task, index) => {
    timeline.push({
      kind: 'task',
      sortAt: Date.parse(String(task.createdAt || task.updatedAt || '')) || Date.now() + 1000 + index,
      key: task.taskId,
      payload: task
    });
  });

  timeline.sort((a, b) => a.sortAt - b.sortAt);

  // Auto-scroll to bottom when new items arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline.length, isSending]);

  if (!timeline.length && !isSending) {
    return (
      <div className="tl-empty">
        <div className="tl-empty__title">还没有消息</div>
        <div className="tl-empty__sub">创建会话后，对话内容会显示在这里。</div>
      </div>
    );
  }

  return (
    <div className="tl-list">
      {timeline.map((item) => {
        if (item.kind === 'task') {
          return (
            <div className="tl-row tl-row--system" key={item.key}>
              <div className="tl-bubble">
                <MediaCard
                  task={item.payload}
                  uid={uid}
                  clientToken={clientToken}
                  onRetry={onRetryTask}
                  disabled={retryDisabled}
                />
              </div>
            </div>
          );
        }
        const role = String(item.payload.role || 'assistant') === 'user' ? 'user' as const : 'assistant' as const;
        return (
          <MessageBubble
            key={item.key}
            role={role}
            text={item.payload.text}
            meta={messageMeta(item.payload)}
            pending={'pending' in item.payload ? item.payload.pending : false}
          />
        );
      })}
      {isSending && (
        <div className="tl-row tl-row--assistant">
          <div className="tl-bubble tl-bubble--typing">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
