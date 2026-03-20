import { useEffect, useMemo, useState } from 'react';
import type { MediaTaskView } from '../lib/types';

interface MediaCardProps {
  task: MediaTaskView;
  uid: string;
  clientToken: string;
  onRetry: (taskId: string) => void;
  disabled?: boolean;
}

type ProbeState = 'idle' | 'loading' | 'ready' | 'failed';

function mediaIntentLabel(intent = ''): string {
  const value = String(intent || '').toLowerCase();
  if (value === 'photo') return '图片';
  if (value === 'video') return '视频';
  if (value === 'voice') return '语音';
  if (value === 'ambient') return '环境音';
  return '内容';
}

function withToken(url: string, uid: string, clientToken: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}uid=${encodeURIComponent(uid)}&clientToken=${encodeURIComponent(clientToken)}`;
}

function formatTaskMeta(task: MediaTaskView): string[] {
  const parts = [mediaIntentLabel(task.intent || '')];
  if (task.updatedAt) {
    const timestamp = Date.parse(task.updatedAt);
    if (Number.isFinite(timestamp)) {
      parts.push(new Date(timestamp).toLocaleString('zh-CN', {
        hour12: false,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }));
    }
  }
  return parts;
}

export function MediaCard({ task, uid, clientToken, onRetry, disabled = false }: MediaCardProps) {
  const url = useMemo(() => {
    if (!task.asset?.url) return '';
    return withToken(task.asset.url, uid, clientToken);
  }, [clientToken, task.asset?.url, uid]);
  const [probe, setProbe] = useState<ProbeState>(task.asset?.available ? 'loading' : 'failed');

  useEffect(() => {
    let cancelled = false;
    if (!url || !task.asset?.available || task.status !== 'done') {
      setProbe(task.status === 'done' ? 'failed' : 'idle');
      return;
    }
    setProbe('loading');
    fetch(url, { method: 'HEAD' })
      .then((response) => {
        if (cancelled) return;
        setProbe(response.ok ? 'ready' : 'failed');
      })
      .catch(() => {
        if (!cancelled) {
          setProbe('failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [task.asset?.available, task.status, url]);

  const meta = formatTaskMeta(task);
  const label = mediaIntentLabel(task.intent || '');
  if (task.status === 'failed') {
    return (
      <div className="media-card media-card--failed">
        <div className="media-card__header">这次{label}生成没有成功。</div>
        <div className="media-card__sub">{task.error || '系统会话里没有拿到可交付资源。'}</div>
        <div className="media-card__footer">
          <span>{meta.join(' · ')}</span>
          <button type="button" className="text-btn" onClick={() => onRetry(task.taskId)} disabled={disabled}>
            再试一次
          </button>
        </div>
      </div>
    );
  }

  if (task.status !== 'done' || probe !== 'ready') {
    const waitingText = task.status === 'retrying'
      ? `正在重新生成${label}，稍后会自动回到这里。`
      : task.status === 'progress'
        ? `正在生成${label}，完成后会直接回到聊天时间线。`
        : `已收到${label}请求，正在排队。`;
    return (
      <div className="media-card media-card--placeholder">
        <div className="media-card__header">{waitingText}</div>
        <div className="media-card__sub">{probe === 'failed' && task.status === 'done' ? '资源还没有稳定可访问，稍后会自动刷新。' : '不会显示坏掉的图标，只有资源可打开时才会渲染。'}</div>
        <div className="media-card__footer">
          <span>{meta.join(' · ')}</span>
        </div>
      </div>
    );
  }

  const kind = String(task.asset?.kind || '').toLowerCase();
  return (
    <div className="media-card media-card--ready">
      {kind === 'photo' ? <img src={url} alt="generated" onError={() => setProbe('failed')} /> : null}
      {kind === 'video' ? <video src={url} controls playsInline onError={() => setProbe('failed')} /> : null}
      {kind === 'voice' || kind === 'audio' || kind === 'ambient' ? <audio src={url} controls onError={() => setProbe('failed')} /> : null}
      <div className="media-card__footer">
        <span>{meta.join(' · ')}</span>
      </div>
    </div>
  );
}
