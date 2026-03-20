interface PaywallPanelProps {
  visible: boolean;
  wechat: string;
  qq: string;
  email: string;
}

export function PaywallPanel({ visible, wechat, qq, email }: PaywallPanelProps) {
  if (!visible) return null;
  return (
    <section className="paywall">
      <h3 className="paywall__title">试用次数已用完</h3>
      <p className="paywall__text">体验版到此结束。如需继续体验或排期正式版本，请直接联系我们。</p>
      <div className="paywall__contacts">
        <div className="paywall__contact">
          <span className="paywall__label">微信</span>
          <strong>{wechat}</strong>
        </div>
        <div className="paywall__contact">
          <span className="paywall__label">QQ</span>
          <strong>{qq}</strong>
        </div>
        <div className="paywall__contact">
          <span className="paywall__label">邮箱</span>
          <strong>{email}</strong>
        </div>
      </div>
    </section>
  );
}
