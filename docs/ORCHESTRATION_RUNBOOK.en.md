# Yaya Orchestration Runbook (EN)

## 1. Goal
Establish a runnable end-to-end loop:
`Landing -> Bot -> Control-plane -> Yaya Runtime -> User Callback`.

## 2. Roles
- Landing: creates UID and acquisition entry
- Bot: collects assets, triggers handoff, communicates status to user
- Control-plane: assignment, runtime orchestration, state persistence
- Yaya Runtime (openclaw/digital-life-card): instantiates Yaya and returns active entrypoint

## 3. Critical APIs
- Bot -> Control-plane: `POST /api/handoff`
- Runtime -> Control-plane (async): `POST /api/runtime/callback`
- Bot polling: `GET /api/session/:uid/status`

## 4. Runtime Modes
### Mode A: `RUNTIME_ORCHESTRATOR_MODE=none`
- control-plane returns `ready` directly (local/demo mode)

### Mode B: `RUNTIME_ORCHESTRATOR_MODE=webhook`
- control-plane sends provision request to `RUNTIME_ORCHESTRATOR_URL`
- runtime can return `ready/provisioning/failed` synchronously
- if `provisioning`, final status is pushed through callback

## 5. Webhook Request Contract (control-plane -> runtime)
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

## 6. Webhook Response Contract (runtime -> control-plane, sync)
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

Supported `status`: `queued | provisioning | ready | failed`.

## 7. Callback Contract (runtime -> control-plane, async)
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

## 8. User-side Bot Behavior
- `runtime=ready`: bot confirms Yaya is ready immediately.
- `runtime=provisioning`: bot enters pending and polls until ready.
- failed/timeout: bot degrades to same-chat active mode.

## 9. Required Environment Variables
### control-plane
- `RUNTIME_ORCHESTRATOR_MODE`
- `RUNTIME_ORCHESTRATOR_URL`
- `RUNTIME_ORCHESTRATOR_KEY`
- `RUNTIME_ORCHESTRATOR_TIMEOUT_MS`

### bot
- `RUNTIME_POLL_INTERVAL_MS`
- `RUNTIME_POLL_MAX_ATTEMPTS`

## 10. Rollout Recommendation
1. Run full-flow stress test in `none` mode first.
2. Switch to `webhook` mode and integrate openclaw runtime.
3. Enable callback and verify automatic `provisioning -> ready` transition.
4. Scale traffic with init success rate and latency monitoring.
