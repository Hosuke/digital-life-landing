import { useMemo, useState } from 'react';
import type { ApplyPayload } from '../lib/types';

interface SessionBootstrapProps {
  busy: boolean;
  onSubmit: (payload: ApplyPayload) => Promise<void>;
}

const defaultForm: ApplyPayload = {
  planType: 'trial',
  applicant: '',
  subject: '',
  relation: '',
  role: '',
  soul: '',
  sharedMemory: '',
  currentWish: '',
  preferredCall: '',
  message: '',
  source: 'lifeview-web-demo'
};

export function SessionBootstrap({ busy, onSubmit }: SessionBootstrapProps) {
  const [form, setForm] = useState<ApplyPayload>(defaultForm);
  const disabled = useMemo(() => busy || !form.applicant.trim() || !form.subject.trim(), [busy, form.applicant, form.subject]);

  return (
    <form
      className="bootstrap-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(form);
      }}
    >
      <div className="panel-card">
        <h2>网页体验建档</h2>
        <p className="panel-copy">关系现在是自由填写。网页体验也不再需要 QQ 号，直接在这里建立会话。</p>
      </div>
      <label>
        <span>你的称呼</span>
        <input value={form.applicant} onChange={(e) => setForm({ ...form, applicant: e.target.value })} placeholder="例如：哥哥 / 妈妈 / 阿青" />
      </label>
      <label>
        <span>TA 的名字</span>
        <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="例如：阿澈" />
      </label>
      <label>
        <span>你和 TA 的关系</span>
        <input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} placeholder="例如：弟弟 / 朋友 / 爱人 / 房东" />
      </label>
      <label>
        <span>TA 是谁</span>
        <textarea value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="例如：他在厦门理工读大四，平时会慢慢说话。" />
      </label>
      <label>
        <span>TA 怎么说话</span>
        <textarea value={form.soul} onChange={(e) => setForm({ ...form, soul: e.target.value })} placeholder="例如：温柔、认真、有点害羞，不爱说空话。" />
      </label>
      <label>
        <span>一段共享记忆</span>
        <textarea value={form.sharedMemory} onChange={(e) => setForm({ ...form, sharedMemory: e.target.value })} placeholder="例如：你们常在学校里散步聊天。" />
      </label>
      <label>
        <span>此刻最想发生什么</span>
        <textarea value={form.currentWish} onChange={(e) => setForm({ ...form, currentWish: e.target.value })} placeholder="例如：想让 TA 发一张今天在校园里的照片给我。" />
      </label>
      <label>
        <span>TA 通常怎么叫你</span>
        <input value={form.preferredCall} onChange={(e) => setForm({ ...form, preferredCall: e.target.value })} placeholder="例如：哥 / 阿青 / 妈妈" />
      </label>
      <label>
        <span>你想补充的话</span>
        <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="不确定也没关系，先写你最想留住的感觉。" />
      </label>
      <button type="submit" className="primary-btn primary-btn--block" disabled={disabled}>
        {busy ? '正在创建体验会话...' : '开始网页体验'}
      </button>
    </form>
  );
}
