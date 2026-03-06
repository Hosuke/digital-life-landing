# Onboarding Bot

## Run
```bash
cd bot
npm install
cp .env.example .env
# set TELEGRAM_BOT_TOKEN
node server.js
```

## Flow
1. User enters from landing page and opens TG deep link with `/start UID-550W-xxxx`
2. Bot binds uid + chat
3. Bot collects assets:
- at least 1 photo
- at least 1 audio/voice with duration >= `MIN_AUDIO_SECONDS`
4. Bot stores files under `BOT_DATA_DIR/assets/<uid>/`
5. Bot triggers handoff callback (`ORCHESTRATOR_WEBHOOK_URL`) if configured
6. Bot marks session active and keeps conversation alive

## Persistence
- `BOT_DATA_DIR/sessions.json` stores session state machine and asset metadata

## Notes
- If webhook is not configured, bot still enters active mode in same TG chat (degraded but usable)
- Use a backend webhook to allocate dedicated TG/WhatsApp session in production
