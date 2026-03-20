import type { ReactNode } from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  text: string;
  meta?: string[];
  pending?: boolean;
  children?: ReactNode;
}

export function MessageBubble({ role, text, meta = [], pending = false, children = null }: MessageBubbleProps) {
  return (
    <div className={`tl-row tl-row--${role}${pending ? ' is-pending' : ''}`}>
      <div className="tl-bubble">
        <div className="tl-text">{text}</div>
        {children}
        {meta.length > 0 && <div className="tl-meta">{meta.join(' \u00b7 ')}</div>}
      </div>
    </div>
  );
}
