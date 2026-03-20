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
      <div className="paywall__icon">⏸</div>
      <h3 className="paywall__title">体验已结束</h3>
      <p className="paywall__text">
        本次试用轮次已全部用完。<br />
        如需继续体验或排期正式版，请联系我们：
      </p>
      <div className="paywall__contacts">
        {wechat && (
          <div className="paywall__contact">
            <span className="paywall__label">微信</span>
            <span className="paywall__value">{wechat}</span>
          </div>
        )}
        {qq && (
          <div className="paywall__contact">
            <span className="paywall__label">QQ</span>
            <span className="paywall__value">{qq}</span>
          </div>
        )}
        {email && (
          <div className="paywall__contact">
            <span className="paywall__label">邮箱</span>
            <span className="paywall__value">{email}</span>
          </div>
        )}
      </div>
    </section>
  );
}
