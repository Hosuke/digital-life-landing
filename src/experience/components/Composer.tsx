import { useState } from 'react';

interface ComposerProps {
  disabled: boolean;
  busy: boolean;
  onSend: (text: string) => Promise<void>;
  onReuseLast: () => Promise<void>;
}

export function Composer({ disabled, busy, onSend, onReuseLast }: ComposerProps) {
  const [text, setText] = useState('');

  const submit = async () => {
    const value = text.trim();
    if (!value || disabled || busy) return;
    await onSend(value);
    setText('');
  };

  return (
    <div className="composer-shell">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="像平时聊天一样告诉我：TA 是谁、TA 怎么说话、你们最想留下什么记忆。"
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
