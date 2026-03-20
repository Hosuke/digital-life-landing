import type { MediaTaskView, OptimisticMessage, RecentMessage, WebDemoView } from '../lib/types';
import { MediaCard } from './MediaCard';
import { MessageBubble } from './MessageBubble';

interface ChatTimelineProps {
  webDemo: WebDemoView | null;
  optimisticMessages: OptimisticMessage[];
  uid: string;
  clientToken: string;
  inlineState: string;
  onRetryTask: (taskId: string) => void;
  retryDisabled?: boolean;
}

type TimelineItem =
  | { kind: 'message'; sortAt: number; key: string; payload: RecentMessage | OptimisticMessage }
  | { kind: 'task'; sortAt: number; key: string; payload: MediaTaskView };

function formatMessageMeta(message: RecentMessage | OptimisticMessage): string[] {
  const parts: string[] = [];
  if ('intent' in message && message.intent) parts.push(message.intent);
  if ('location' in message && message.location) parts.push(message.location);
  if ('pending' in message && message.pending) parts.push('发送中');
  const timestamp = Date.parse(String(message.at || ''));
  if (Number.isFinite(timestamp)) {
    parts.push(new Date(timestamp).toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }
  return parts;
}

export function ChatTimeline({
  webDemo,
  optimisticMessages,
  uid,
  clientToken,
  inlineState,
  onRetryTask,
  retryDisabled = false
}: ChatTimelineProps) {
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

  if (!timeline.length) {
    return (
      <div className="timeline-empty">
        <div className="timeline-empty__title">这里会显示建档、聊天、图片、语音和视频回传。</div>
        <div className="timeline-empty__subtitle">{inlineState}</div>
      </div>
    );
  }

  return (
    <div className="timeline-list">
      {timeline.map((item) => {
        if (item.kind === 'task') {
          return (
            <div className="timeline-row timeline-row--system" key={item.key}>
              <div className="timeline-bubble">
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
        const role = String(item.payload.role || 'assistant') === 'user' ? 'user' : 'assistant';
        return (
          <MessageBubble
            key={item.key}
            role={role}
            text={item.payload.text}
            meta={formatMessageMeta(item.payload)}
            pending={'pending' in item.payload ? item.payload.pending : false}
          />
        );
      })}
    </div>
  );
}
