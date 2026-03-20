import type { WebDemoView } from '../lib/types';

interface StatusBarProps {
  uid: string;
  webDemo: WebDemoView | null;
}

function phaseLabel(phase = ''): string {
  const map: Record<string, string> = {
    discovery: '建档采集',
    asset_intake: '等待素材',
    ready_to_boot: '准备启动',
    locking: '正在唤醒',
    live: '已进入 live'
  };
  return map[String(phase || '').trim()] || '未开始';
}

function phaseTone(phase = ''): string {
  const value = String(phase || '').trim();
  if (value === 'live') return 'live';
  if (value === 'locking' || value === 'ready_to_boot') return 'awakening';
  return 'onboarding';
}

export function StatusBar({ uid, webDemo }: StatusBarProps) {
  const phase = webDemo?.phase || '';
  return (
    <div className={`status-bar status-bar--${phaseTone(phase)}`}>
      <div className="status-card">
        <span className="status-label">UID</span>
        <code className="status-value status-value--uid">{uid || '尚未建立 UID'}</code>
      </div>
      <div className={`status-chip status-chip--${phaseTone(phase)}`}>阶段：{phaseLabel(phase)}</div>
      <div className="status-chip">剩余次数：{webDemo?.remainingTurns ?? '--'}</div>
      <div className="status-chip">声线：{webDemo?.voiceMode === 'cloned' ? '音色已克隆' : '默认映射'}</div>
    </div>
  );
}
