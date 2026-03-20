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

export function StatusBar({ uid, webDemo }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-card">
        <span className="status-label">UID</span>
        <code className="status-value status-value--uid">{uid || '尚未建立 UID'}</code>
      </div>
      <div className="status-chip">阶段：{phaseLabel(webDemo?.phase || '')}</div>
      <div className="status-chip">剩余次数：{webDemo?.remainingTurns ?? '--'}</div>
      <div className="status-chip">声线：{webDemo?.voiceMode === 'cloned' ? '音色已克隆' : '默认映射'}</div>
    </div>
  );
}
