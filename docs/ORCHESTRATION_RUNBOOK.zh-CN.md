# 丫丫实例化编排运行手册（ZH）

## 1. 目的
把 `Landing -> Bot -> Control-plane -> Yaya Runtime -> 回传用户` 串成可运行的闭环。

## 2. 编排角色
- Landing：创建 UID，触发入口
- Bot：收素材、触发 handoff、给用户回传状态
- Control-plane：会话分配、运行时编排、状态落库
- Yaya Runtime（openclaw/digital-life-card）：真正实例化“丫丫”并返回可用入口

## 3. 关键接口
- Bot -> Control-plane：`POST /api/handoff`
- Runtime -> Control-plane（异步回调）：`POST /api/runtime/callback`
- Bot 轮询：`GET /api/session/:uid/status`

## 4. 运行模式
### 模式 A：`RUNTIME_ORCHESTRATOR_MODE=none`
- 控制面直接返回 ready（用于本地演示）

### 模式 B：`RUNTIME_ORCHESTRATOR_MODE=webhook`
- 控制面把实例化请求发到 `RUNTIME_ORCHESTRATOR_URL`
- 运行时可同步返回 `ready/provisioning/failed`
- 若先返回 `provisioning`，后续通过 callback 更新最终状态

## 5. Webhook 请求契约（control-plane -> runtime）
```json
{
  "event": "runtime.provision.requested",
  "uid": "UID-550W-...",
  "order": {"...": "..."},
  "session": {"...": "..."},
  "assignment": {"kind": "telegram", "channelId": "tg-worker-01"},
  "callbackUrl": "https://<control-plane>/api/runtime/callback",
  "statusUrl": "https://<control-plane>/api/session/<uid>/status"
}
```

## 6. Webhook 响应契约（runtime -> control-plane，同步）
```json
{
  "provider": "openclaw",
  "status": "provisioning",
  "sessionId": "runtime-123",
  "entrypoint": "https://t.me/...",
  "message": "initializing yaya",
  "meta": {"region": "sg"}
}
```

`status` 支持：`queued | provisioning | ready | failed`。

## 7. Callback 契约（runtime -> control-plane，异步）
```json
{
  "uid": "UID-550W-...",
  "runtime": {
    "provider": "openclaw",
    "status": "ready",
    "sessionId": "runtime-123",
    "entrypoint": "https://t.me/...",
    "message": "yaya ready",
    "meta": {"worker": "sg-01"}
  }
}
```

## 8. Bot 用户侧表现
- handoff 返回 `runtime=ready`：立即通知“丫丫初始化完成”。
- handoff 返回 `runtime=provisioning`：Bot 进入 pending，并轮询状态后主动通知。
- runtime 失败/超时：降级为当前窗口继续体验。

## 9. 必配环境变量
### control-plane
- `RUNTIME_ORCHESTRATOR_MODE`
- `RUNTIME_ORCHESTRATOR_URL`
- `RUNTIME_ORCHESTRATOR_KEY`
- `RUNTIME_ORCHESTRATOR_TIMEOUT_MS`

### bot
- `RUNTIME_POLL_INTERVAL_MS`
- `RUNTIME_POLL_MAX_ATTEMPTS`

## 10. 建议上线步骤
1. 先在 `none` 模式全链路压测（确保状态机稳定）。
2. 再切到 `webhook` 模式接 openclaw runtime。
3. 开启 callback，验证 `provisioning -> ready` 自动回传。
4. 监控初始化成功率和平均耗时，逐步放量。
