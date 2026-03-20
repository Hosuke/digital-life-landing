interface PaywallPanelProps {
  visible: boolean;
  wechat: string;
  qq: string;
  email: string;
}

export function PaywallPanel({ visible, wechat, qq, email }: PaywallPanelProps) {
  if (!visible) return null;
  return (
    <section className="paywall-panel">
      <h3>试用次数已用完</h3>
      <p>体验版到这里结束。若要继续长期体验或排期正式版本，请直接人工联系。</p>
      <div className="paywall-grid">
        <div>
          <span className="paywall-label">微信</span>
          <strong>{wechat}</strong>
        </div>
        <div>
          <span className="paywall-label">QQ</span>
          <strong>{qq}</strong>
        </div>
        <div>
          <span className="paywall-label">邮箱</span>
          <strong>{email}</strong>
        </div>
      </div>
    </section>
  );
}
