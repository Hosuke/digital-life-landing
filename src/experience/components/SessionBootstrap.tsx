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

  const canSubmit = useMemo(
    () => !busy && form.applicant.trim().length > 0 && form.subject.trim().length > 0,
    [busy, form.applicant, form.subject]
  );

  return (
    <form
      className="bootstrap-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) void onSubmit(form);
      }}
    >
      <h2 className="bootstrap-form__title">唤醒 TA</h2>
      <p className="bootstrap-form__hint">只需名字就能开始。描述越多，角色越像本人。</p>

      <label className="form-field">
        <span className="form-field__label form-field__label--required">你的称呼</span>
        <input
          value={form.applicant}
          onChange={(e) => setForm({ ...form, applicant: e.target.value })}
          placeholder="例如：哥哥 / 妈妈 / 阿青"
        />
      </label>

      <label className="form-field">
        <span className="form-field__label form-field__label--required">TA 的名字</span>
        <input
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          placeholder="例如：阿澈"
        />
      </label>

      <button
        type="button"
        className="toggle-btn"
        onClick={() => setOptionalOpen(!optionalOpen)}
      >
        {optionalOpen ? '收起补充信息 \u25B2' : '补充更多信息（可选）\u25BC'}
      </button>

      {optionalOpen && (
        <div className="optional-fields">
          <label className="form-field">
            <span className="form-field__label">你和 TA 的关系</span>
            <input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} placeholder="例如：弟弟 / 朋友 / 爱人" />
          </label>
          <label className="form-field">
            <span className="form-field__label">TA 是谁</span>
            <textarea value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="例如：他在厦门理工读大四，喜欢打球和写代码。" />
          </label>
          <label className="form-field">
            <span className="form-field__label">TA 怎么说话</span>
            <textarea value={form.soul} onChange={(e) => setForm({ ...form, soul: e.target.value })} placeholder="例如：话不多但很暖 / 说话直接干脆" />
          </label>
          <label className="form-field">
            <span className="form-field__label">你们之间的记忆</span>
            <textarea value={form.sharedMemory} onChange={(e) => setForm({ ...form, sharedMemory: e.target.value })} placeholder="例如：去年冬天一起通宵写代码。" />
          </label>
          <label className="form-field">
            <span className="form-field__label">TA 怎么叫你</span>
            <input value={form.preferredCall} onChange={(e) => setForm({ ...form, preferredCall: e.target.value })} placeholder="例如：哥 / 阿青" />
          </label>
          <label className="form-field">
            <span className="form-field__label">想补充的话</span>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="任何你觉得重要的细节。" />
          </label>
        </div>
      )}

      <button type="submit" className="primary-btn primary-btn--block" disabled={!canSubmit}>
        {busy ? '正在创建...' : '唤醒 TA'}
      </button>
    </form>
  );
}
