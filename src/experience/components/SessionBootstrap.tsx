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
    () => busy || !form.applicant.trim() || !form.subject.trim() || !form.role.trim() || !form.soul.trim(),
    [busy, form.applicant, form.subject, form.role, form.soul]
  );

  const showSoulHint = useMemo(
    () => !form.soul.trim() && (form.applicant.trim() || form.subject.trim() || form.relation.trim() || form.role.trim()),
    [form.soul, form.applicant, form.subject, form.relation, form.role]
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
        <p className="panel-copy">填写基本信息后上传一张照片，就可以开始和 TA 聊天了。</p>
      </div>

      {/* Required fields */}
      <fieldset className="field-group field-group--required">
        <legend className="field-group-legend">必填</legend>
        <label>
          <span className="field-required">你的称呼</span>
          <input value={form.applicant} onChange={(e) => setForm({ ...form, applicant: e.target.value })} placeholder="例如：哥哥 / 妈妈 / 阿青" />
        </label>
        <label>
          <span className="field-required">TA 的名字</span>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="例如：阿澈" />
        </label>
        <label>
          <span className="field-required">你和 TA 的关系</span>
          <input value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} placeholder="例如：弟弟 / 朋友 / 爱人 / 房东" />
        </label>
        <label>
          <span className="field-required">TA 是谁</span>
          <textarea value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="例如：他在厦门理工读大四，平时会慢慢说话。" />
        </label>
        <label>
          <span className="field-required field-required--highlight">TA 怎么说话（很重要）</span>
          <textarea value={form.soul} onChange={(e) => setForm({ ...form, soul: e.target.value })} placeholder="例如：说话慢慢的、温柔、经常用省略号。或者：直来直去、话不多但很暖。" />
          {showSoulHint && <p className="field-hint">说话风格是启动的必要信息，哪怕简单写也行。</p>}
        </label>
      </fieldset>

      {/* Optional fields (collapsible) */}
      <fieldset className="field-group field-group--optional">
        <legend
          className="field-group-legend field-group-legend--toggle"
          onClick={() => setOptionalOpen(!optionalOpen)}
        >
          选填 {optionalOpen ? '▲' : '▼'}
        </legend>
        {optionalOpen && (
          <>
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
          </>
        )}
      </fieldset>

      <button type="submit" className="primary-btn primary-btn--block" disabled={disabled}>
        {busy ? '正在创建体验会话...' : '唤醒 TA'}
      </button>
    </form>
  );
}
