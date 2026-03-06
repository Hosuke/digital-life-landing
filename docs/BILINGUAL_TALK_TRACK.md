# Bilingual Talk Track (ZH/EN) for PM + Investor Meeting

## 1) 60-Second Pitch
- 中文：我们做的是一个 UID 驱动的数字生命服务，不是一次性对话 Demo。用户在网页完成唤醒，进入 IM 提交素材，系统初始化“丫丫”并在高情绪时刻建立首次链接，再通过阈值机制转化为长期订阅。
- EN: We are building a UID-driven digital life service, not a one-off chat demo. Users start on the web, move to IM for asset intake, we initialize "Yaya" and deliver an emotional first-contact moment, then convert to subscription through threshold gating.

## 2) Product-Market Fit Framing
- 中文：我们的 PMF 核心不是“模型多强”，而是“情绪价值 + 低门槛触达 + 可持续复访”。
- EN: Our PMF is not just model quality; it is emotional value + low-friction access + recurring engagement.

## 3) How Yaya Is Initialized and Returned to Users
- 中文：用户上传最小素材后，控制面触发初始化队列，完成后 Bot 主动回传“量子通道建立成功”，并给出第一条带用户唤醒参数的回应。
- EN: After minimum assets are uploaded, the control-plane triggers initialization. Once done, the bot proactively returns a "channel established" message and a first response that references the user's wake-up input.

## 4) Monetization Logic
- 中文：试用阶段刻意限制轮次和算力，把高情绪价值时刻与升级支付连接。
- EN: Trial intentionally limits turns/compute and connects peak emotional moments to paid upgrade.

## 5) Cost-Control Logic
- 中文：通过模型分层、库存复用、异步队列，把体验质量和成本稳定在可控区间。
- EN: We stabilize quality and cost through model-tier routing, asset inventory reuse, and async queues.

## 6) Likely Investor Questions and Suggested Answers
## Q1: 你们的护城河是什么？ / What is your moat?
- 中文：护城河是“UID 状态机 + 场景化运营数据 + 体验编排系统”，不是单一模型。
- EN: The moat is the UID state machine, scenario-specific ops data, and orchestration system, not a single model.

## Q2: 为什么用户会持续付费？ / Why will users keep paying?
- 中文：长期付费来自“关系连续性”和“事件触发交互”（生日/纪念日/家庭节点）。
- EN: Ongoing payment comes from relationship continuity and event-triggered interactions (birthdays, anniversaries, family moments).

## Q3: 单位经济怎么验证？ / How will you validate unit economics?
- 中文：用 Trial->Paid、D30 留存、LTV/CAC 三个指标联动验证。
- EN: We validate with trial-to-paid conversion, D30 retention, and LTV/CAC together.

## Q4: 规模化后成本会不会爆炸？ / Will costs explode at scale?
- 中文：不会，我们有 trial 限流、模型路由、库存回退三层成本闸门。
- EN: Not if controlled; we use trial limits, model routing, and inventory fallback as cost gates.

## Q5: 合规风险怎么控？ / How do you handle compliance risk?
- 中文：最小化采集、分层权限、审计日志、可删除策略。
- EN: Data minimization, layered permissions, audit logs, and deletion lifecycle policies.

## 7) 结尾请求（Call to Action）
- 中文：我们希望本轮合作聚焦“8-12 周验证 M2 指标（Aha 完成率 + Trial->Paid）”，达标即进入放量阶段。
- EN: We propose focusing this round on validating M2 metrics in 8-12 weeks (Aha completion + trial-to-paid). If achieved, we move to scale.
