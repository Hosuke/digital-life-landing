# Telegram Onboarding Bot

## Run
```bash
cd bot
npm install
cp .env.example .env
# set TELEGRAM_BOT_TOKEN
node server.js
```

## Env
- `TELEGRAM_BOT_TOKEN`: Telegram bot token
- `MIN_AUDIO_SECONDS`: minimum required audio duration (default 10)
- `BOT_DATA_DIR`: local bot persistence directory
- `CONTROL_PLANE_BASE_URL`: control-plane base URL (recommended)
- `CONTROL_PLANE_KEY`: shared secret for control-plane internal APIs
- `PREFERRED_CHANNEL_KINDS`: e.g. `telegram,whatsapp`
- `ORCHESTRATOR_WEBHOOK_URL`: legacy handoff webhook fallback

## Flow
1. User enters from landing page with `/start UID-550W-...`
2. Bot binds uid + chat and notifies control-plane (`/api/bind`)
3. Bot collects assets:
- at least 1 photo
- at least 1 audio/voice with duration >= `MIN_AUDIO_SECONDS`
4. Bot stores files under `BOT_DATA_DIR/assets/<uid>/`
5. Bot calls control-plane handoff (`/api/handoff`) for dedicated channel allocation
6. If allocation fails, bot keeps current chat active as degraded mode

## Persistence
- `BOT_DATA_DIR/sessions.json`: bot session state + asset metadata

## Notes
- Bot will never echo internal shell commands to user chat.
- In production, set `CONTROL_PLANE_KEY` and rotate bot token regularly.
