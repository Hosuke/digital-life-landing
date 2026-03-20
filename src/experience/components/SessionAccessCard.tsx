import { useState } from 'react';

interface SessionAccessCardProps {
  uid: string;
  clientToken: string;
}

async function copyText(value: string): Promise<boolean> {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

export function SessionAccessCard({ uid, clientToken }: SessionAccessCardProps) {
  const [copied, setCopied] = useState<'uid' | 'token' | ''>('');

  const copyField = async (field: 'uid' | 'token', value: string) => {
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(field);
    window.setTimeout(() => setCopied(''), 1800);
  };

  return (
    <section className="panel-card session-access-card">
      <h3>找回凭证</h3>
      <p className="panel-copy">正式账号系统还没接入前，跨设备找回需要保留这两项。后续会升级成更友好的恢复码或邮箱登录。</p>
      <div className="session-access-field">
        <span className="status-label">UID</span>
        <code>{uid}</code>
        <button type="button" className="text-btn" onClick={() => void copyField('uid', uid)}>
          {copied === 'uid' ? '已复制' : '复制 UID'}
        </button>
      </div>
      <div className="session-access-field">
        <span className="status-label">clientToken</span>
        <code>{clientToken}</code>
        <button type="button" className="text-btn" onClick={() => void copyField('token', clientToken)}>
          {copied === 'token' ? '已复制' : '复制令牌'}
        </button>
      </div>
    </section>
  );
}
