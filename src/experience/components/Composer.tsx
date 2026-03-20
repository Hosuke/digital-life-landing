import { useMemo, useState } from 'react';

interface ComposerProps {
  disabled: boolean;
  busy: boolean;
  phase: string;
  onSend: (text: string) => Promise<void>;
  onReuseLast: () => Promise<void>;
}

function placeholderByPhase(phase = ''): string {
  const value = String(phase || '').trim();
  if (value === 'live') return '现在已经进入 live。像平时聊天一样说话，或直接让 TA 发照片、语音、视频。';
  if (value === 'locking') return '角色正在唤醒，暂时不用继续输入。';
  if (value === 'asset_intake') return '继续自然补充也可以，但现在最关键的是上传一张正面照。';
  return '先像聊天一样描述 TA：TA 是谁、怎么说话、你们之间最想保留的记忆。';
}

export function Composer({ disabled, busy, phase, onSend, onReuseLast }: ComposerProps) {
  const [text, setText] = useState('');
  const placeholder = useMemo(() => placeholderByPhase(phase), [phase]);

  const submit = async () => {
    const value = text.trim();
    if (!value || disabled || busy) return;
    await onSend(value);
    setText('');
  };

  return (
    <div className={`composer-shell composer-shell--${String(phase || 'idle').replace(/[^a-z_\-]/gi, '') || 'idle'}`}>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
      <div className="composer-actions">
        <button type="button" className="primary-btn" onClick={() => void submit()} disabled={disabled || busy || !text.trim()}>
          {busy ? '发送中...' : '发送消息'}
        </button>
        <button type="button" className="ghost-btn" onClick={() => void onReuseLast()} disabled={disabled || busy}>
          重发上一句
        </button>
      </div>
    </div>
  );
}
