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
  const [optionalOpen, setOptionalOpen] = useState(false);

  const disabled = useMemo(
    () => busy || !form.applicant.trim() || !form.subject.trim(),
    [busy, form.applicant, form.subject]
  );

  return (
    <form
      className="bootstrap-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(form);
      }}
    >
      <div className="panel-card">
        <h2>唤醒 TA</h2>
        <p className="panel-copy">只需要名字就可以开始。描述越多，角色越像本人。</p>
      </div>

      <fieldset className="field-group field-group--required">
        <legend className="field-group-legend">基本信息</legend>
        <label>
          <span className="field-required">你的称呼</span>
          <input value={form.applicant} onChange={(e) => setForm({ ...form, applicant: e.target.value })} placeholder="例如：哥哥 / 妈妈 / 阿青" />
        </label>
        <label>
          <span className="field-required">TA 的名字</span>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="例如：阿澈" />
        </label>
        <label>
          <span>你和 TA 的关系</span>
          <input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} placeholder="例如：弟弟 / 朋友 / 爱人" />
        </label>
        <label>
          <span>TA 是谁</span>
          <textarea value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="例如：他在厦门理工读大四，喜欢打球和写代码。" />
        </label>
        <label>
          <span>TA 怎么说话</span>
          <textarea value={form.soul} onChange={(e) => setForm({ ...form, soul: e.target.value })} placeholder="例如：话不多但很暖 / 说话直接干脆 / 温柔爱撒娇（留空会自动推断）" />
        </label>
      </fieldset>

      <fieldset className="field-group field-group--optional">
        <legend
          className="field-group-legend field-group-legend--toggle"
          onClick={() => setOptionalOpen(!optionalOpen)}
        >
          补充更多细节 {optionalOpen ? '▲' : '▼'}
        </legend>
        {optionalOpen && (
          <>
            <label>
              <span>你们之间的记忆</span>
              <textarea value={form.sharedMemory} onChange={(e) => setForm({ ...form, sharedMemory: e.target.value })} placeholder="例如：去年冬天一起通宵写代码。" />
            </label>
            <label>
              <span>TA 最想做的事</span>
              <textarea value={form.currentWish} onChange={(e) => setForm({ ...form, currentWish: e.target.value })} placeholder="例如：考研成功 / 完成毕业设计。" />
            </label>
            <label>
              <span>TA 怎么叫你</span>
              <input value={form.preferredCall} onChange={(e) => setForm({ ...form, preferredCall: e.target.value })} placeholder="例如：哥 / 阿青 / 妈妈" />
            </label>
            <label>
              <span>想补充的话</span>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="任何你觉得重要的细节。" />
            </label>
          </>
        )}
      </fieldset>

      <button type="submit" className="primary-btn primary-btn--block" disabled={disabled}>
        {busy ? '正在创建体验会话...' : '唤醒 TA'}
      </button>
    </form>
  );
}
