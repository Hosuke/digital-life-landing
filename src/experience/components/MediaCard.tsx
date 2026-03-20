import { useMemo, useState } from 'react';
import type { MediaTaskView } from '../lib/types';

interface MediaCardProps {
  task: MediaTaskView;
  uid: string;
  clientToken: string;
  onRetry: (taskId: string) => void;
  disabled?: boolean;
}

function mediaIntentLabel(intent = ''): string {
  const value = String(intent || '').toLowerCase();
  if (value === 'photo') return '图片';
  if (value === 'video') return '视频';
  if (value === 'voice' || value === 'audio') return '语音';
  if (value === 'ambient') return '环境音';
  return '内容';
}

function withAuth(url: string, uid: string, clientToken: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}uid=${encodeURIComponent(uid)}&clientToken=${encodeURIComponent(clientToken)}`;
}

function formatTaskTime(task: MediaTaskView): string {
  const raw = task.updatedAt || task.createdAt;
  if (!raw) return '';
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return '';
  return new Date(ts).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function MediaCard({ task, uid, clientToken, onRetry, disabled = false }: MediaCardProps) {
  const label = mediaIntentLabel(task.intent || '');
  const time = formatTaskTime(task);
  const [loadError, setLoadError] = useState(false);

  const url = useMemo(() => {
    if (task.status !== 'done' || !task.asset?.url) return '';
    return withAuth(task.asset.url, uid, clientToken);
  }, [task.status, task.asset?.url, uid, clientToken]);

  // Failed task
  if (task.status === 'failed') {
    return (
      <div className="media-card media-card--failed">
        <div className="media-card__header">{label}生成失败</div>
        <div className="media-card__sub">{task.error || '生成过程中出了问题。'}</div>
        <div className="media-card__footer">
          <span>{time}</span>
          <button type="button" className="text-btn" onClick={() => onRetry(task.taskId)} disabled={disabled}>
            重试
          </button>
        </div>
      </div>
    );
  }

  // Still processing
  if (task.status !== 'done') {
    const statusText =
      task.status === 'retrying' ? `正在重新生成${label}...` :
      task.status === 'progress' ? `正在生成${label}...` :
      `${label}排队中...`;
    return (
      <div className="media-card media-card--progress">
        <div className="media-card__header">
          <span className="media-card__spinner" />
          {statusText}
        </div>
        {time && <div className="media-card__footer"><span>{time}</span></div>}
      </div>
    );
  }

  // Done but no URL
  if (!url) {
    return (
      <div className="media-card media-card--failed">
        <div className="media-card__header">{label}已生成，但暂时无法获取。</div>
        <div className="media-card__footer">
          <span>{time}</span>
          <button type="button" className="text-btn" onClick={() => onRetry(task.taskId)} disabled={disabled}>
            重试
          </button>
        </div>
      </div>
    );
  }

  // Load error after rendering
  if (loadError) {
    return (
      <div className="media-card media-card--failed">
        <div className="media-card__header">{label}加载失败</div>
        <div className="media-card__footer">
          <span>{time}</span>
          <button type="button" className="text-btn" onClick={() => setLoadError(false)}>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // Done + URL: render directly, no HEAD probe
  const kind = String(task.asset?.kind || task.intent || '').toLowerCase();
  return (
    <div className="media-card media-card--ready">
      {kind === 'photo' && <img src={url} alt={label} onError={() => setLoadError(true)} />}
      {kind === 'video' && <video src={url} controls playsInline onError={() => setLoadError(true)} />}
      {(kind === 'voice' || kind === 'audio' || kind === 'ambient') && <audio src={url} controls onError={() => setLoadError(true)} />}
      {time && <div className="media-card__footer"><span>{label} \u00b7 {time}</span></div>}
    </div>
  );
}
