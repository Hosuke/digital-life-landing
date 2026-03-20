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
    <div className={`timeline-row timeline-row--${role}${pending ? ' is-pending' : ''}`}>
      <div className="timeline-bubble">
        <div className="timeline-text">{text}</div>
        {children}
        {meta.length ? <div className="timeline-meta">{meta.join(' · ')}</div> : null}
      </div>
    </div>
  );
}
