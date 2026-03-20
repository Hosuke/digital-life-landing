import { useState } from 'react';

interface ComposerProps {
  disabled: boolean;
  busy: boolean;
  phase: string;
  onSend: (text: string) => Promise<void>;
}

function placeholderByPhase(phase = ''): string {
  const value = String(phase || '').trim();
  if (value === 'live') return '像平时聊天一样说话，或让 TA 发照片、语音、视频...';
  if (value === 'locking') return '角色正在唤醒，请稍等...';
  if (value === 'asset_intake') return '继续补充也行，但现在最关键的是上传一张正面照。';
  return '描述 TA：TA 是谁、怎么说话、你们之间的记忆...';
}

export function Composer({ disabled, busy, phase, onSend }: ComposerProps) {
  const [text, setText] = useState('');

  const submit = async () => {
    const value = text.trim();
    if (!value || disabled || busy) return;
    setText('');
    await onSend(value);
  };

  return (
    <div className="composer">
      <textarea
        className="composer__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholderByPhase(phase)}
        disabled={disabled}
        rows={2}
      />
      <button
        type="button"
        className="composer__send primary-btn"
        onClick={() => void submit()}
        disabled={disabled || busy || !text.trim()}
      >
        {busy ? '发送中...' : '发送'}
      </button>
    </div>
  );
}
