import { useMemo, useState } from 'react';

interface RestoreSessionPanelProps {
  busy: boolean;
  hasLocalSnapshot: boolean;
  onRestore: (uid: string, clientToken: string) => Promise<void>;
  onUseLocalSnapshot: () => Promise<void>;
}

export function RestoreSessionPanel({
  busy,
  hasLocalSnapshot,
  onRestore,
  onUseLocalSnapshot
}: RestoreSessionPanelProps) {
  const [uid, setUid] = useState('');
  const [clientToken, setClientToken] = useState('');
  const disabled = useMemo(() => busy || !uid.trim() || !clientToken.trim(), [busy, uid, clientToken]);

  return (
    <div className="restore-panel">
      <div className="panel-card">
        <h2>找回已有角色</h2>
        <p className="panel-copy">当前版本不强制账号。若是同一设备，可以直接恢复本机上次会话；若是跨设备，请输入 `UID + 体验令牌`。</p>
      </div>
      <label>
        <span>角色 UID</span>
        <input value={uid} onChange={(event) => setUid(event.target.value)} placeholder="例如：UID-AMBER-20260320-XXXXXX" />
      </label>
      <label>
        <span>体验令牌</span>
        <textarea value={clientToken} onChange={(event) => setClientToken(event.target.value)} placeholder="创建体验时返回的 clientToken。后续会升级成账号或更友好的恢复码。" />
      </label>
      <div className="restore-actions">
        <button type="button" className="primary-btn" disabled={disabled} onClick={() => void onRestore(uid.trim(), clientToken.trim())}>
          {busy ? '正在恢复...' : '恢复这个角色'}
        </button>
        <button type="button" className="ghost-btn" disabled={busy || !hasLocalSnapshot} onClick={() => void onUseLocalSnapshot()}>
          恢复本机上次角色
        </button>
      </div>
    </div>
  );
}
