import type { MediaTaskView } from '../lib/types';
import { MediaCard } from './MediaCard';

interface MediaTaskFeedProps {
  tasks: MediaTaskView[];
  uid: string;
  clientToken: string;
  onRetryTask: (taskId: string) => void;
  retryDisabled?: boolean;
}

export function MediaTaskFeed({
  tasks,
  uid,
  clientToken,
  onRetryTask,
  retryDisabled = false
}: MediaTaskFeedProps) {
  if (!tasks.length) {
    return (
      <div className="panel-card media-feed-empty">
        <h3>媒体回传</h3>
        <p className="panel-copy">当角色生成图片、语音或视频时，会先在这里显示状态，再在资源可访问后展示内容。</p>
      </div>
    );
  }

  return (
    <section className="media-feed">
      <div className="panel-card media-feed-header">
        <h3>媒体回传</h3>
        <p className="panel-copy">图片、语音、视频会在这里持续刷新，不会直接显示坏掉的图标。</p>
      </div>
      <div className="media-feed-list">
        {tasks.map((task) => (
          <div key={task.taskId} className="timeline-row timeline-row--system">
            <div className="timeline-bubble">
              <MediaCard
                task={task}
                uid={uid}
                clientToken={clientToken}
                onRetry={onRetryTask}
                disabled={retryDisabled}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
