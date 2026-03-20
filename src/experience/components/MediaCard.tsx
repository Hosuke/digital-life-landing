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
  if (value === 'voice' || value === 'audio') return '语音';
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
  // Build authenticated URL if asset exists
  const url = useMemo(() => {
    if (!task.asset?.url) return '';
    return withToken(task.asset.url, uid, clientToken);
  }, [clientToken, task.asset?.url, uid]);

  // Determine initial probe state: if task is done and has a URL, start probing
  const shouldProbe = task.status === 'done' && Boolean(url);
  const [probe, setProbe] = useState<ProbeState>(shouldProbe ? 'loading' : 'idle');

  useEffect(() => {
    let cancelled = false;

    if (!url || task.status !== 'done') {
      setProbe('idle');
      return;
    }

    setProbe('loading');

    // Use a timeout to avoid hanging forever
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    fetch(url, { method: 'HEAD', signal: controller.signal })
      .then((response) => {
        clearTimeout(timer);
        if (cancelled) return;
        setProbe(response.ok ? 'ready' : 'failed');
      })
      .catch(() => {
        clearTimeout(timer);
        if (!cancelled) {
          // On network error, still try to render — the img/audio tag itself will show if it loads
          setProbe('ready');
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [task.status, url]);

  const meta = formatTaskMeta(task);
  const label = mediaIntentLabel(task.intent || '');

  // Failed task
  if (task.status === 'failed') {
    return (
      <div className="media-card media-card--failed">
        <div className="media-card__header">这次{label}生成没有成功。</div>
        <div className="media-card__sub">{task.error || '生成过程中出了问题。'}</div>
        <div className="media-card__footer">
          <span>{meta.join(' · ')}</span>
          <button type="button" className="text-btn" onClick={() => onRetry(task.taskId)} disabled={disabled}>
            再试一次
          </button>
        </div>
      </div>
    );
  }

  // Still processing / queued
  if (task.status !== 'done') {
    const waitingText = task.status === 'retrying'
      ? `正在重新生成${label}...`
      : task.status === 'progress'
        ? `正在生成${label}，完成后会显示在这里。`
        : `已收到${label}请求，正在排队。`;
    return (
      <div className="media-card media-card--placeholder">
        <div className="media-card__header">{waitingText}</div>
        <div className="media-card__footer">
          <span>{meta.join(' · ')}</span>
        </div>
      </div>
    );
  }

  // Done but no URL (shouldn't happen after fix, but handle gracefully)
  if (!url) {
    return (
      <div className="media-card media-card--failed">
        <div className="media-card__header">{label}已生成，但暂时无法获取。</div>
        <div className="media-card__footer">
          <span>{meta.join(' · ')}</span>
          <button type="button" className="text-btn" onClick={() => onRetry(task.taskId)} disabled={disabled}>
            再试一次
          </button>
        </div>
      </div>
    );
  }

  // Done + probing
  if (probe === 'loading') {
    return (
      <div className="media-card media-card--placeholder">
        <div className="media-card__header">正在加载{label}...</div>
        <div className="media-card__footer">
          <span>{meta.join(' · ')}</span>
        </div>
      </div>
    );
  }

  // Done + ready (or optimistically trying to render)
  const kind = String(task.asset?.kind || task.intent || '').toLowerCase();
  return (
    <div className="media-card media-card--ready">
      {kind === 'photo' ? <img src={url} alt={label} onError={() => setProbe('failed')} /> : null}
      {kind === 'video' ? <video src={url} controls playsInline onError={() => setProbe('failed')} /> : null}
      {kind === 'voice' || kind === 'audio' || kind === 'ambient' ? <audio src={url} controls onError={() => setProbe('failed')} /> : null}
      <div className="media-card__footer">
        <span>{meta.join(' · ')}</span>
      </div>
    </div>
  );
}
