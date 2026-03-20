import type { WebDemoView } from '../lib/types';

interface StatusBarProps {
  uid: string;
  webDemo: WebDemoView | null;
}

function phaseLabel(phase = ''): string {
  const map: Record<string, string> = {
    discovery: '建档',
    asset_intake: '建档',
    ready_to_boot: '唤醒中',
    locking: '唤醒中',
    live: '对话中'
  };
  return map[String(phase || '').trim()] || '未开始';
}

export function StatusBar({ uid, webDemo }: StatusBarProps) {
  const phase = webDemo?.phase || '';
  const remaining = webDemo?.remainingTurns;

  return (
    <div className="status-bar">
      <div className="status-bar__item">
        <span className="status-bar__label">UID</span>
        <code className="status-bar__value status-bar__value--uid" title={uid || ''}>{uid || '--'}</code>
      </div>
      <div className="status-bar__item">
        <span className="status-bar__label">阶段</span>
        <span className="status-bar__value">{phaseLabel(phase)}</span>
      </div>
      <div className="status-bar__item">
        <span className="status-bar__label">剩余</span>
        <span className="status-bar__value">{remaining != null ? `${remaining} 轮` : '--'}</span>
      </div>
    </div>
  );
}
