require('dotenv').config();
const fsp = require('fs/promises');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
  console.error('TELEGRAM_BOT_TOKEN missing.');
  process.exit(1);
}

const MIN_AUDIO_SECONDS = Number(process.env.MIN_AUDIO_SECONDS || 10);
const ORCHESTRATOR_WEBHOOK_URL = process.env.ORCHESTRATOR_WEBHOOK_URL || '';
const CONTROL_PLANE_BASE_URL = (process.env.CONTROL_PLANE_BASE_URL || '').replace(/\/+$/, '');
const CONTROL_PLANE_KEY = process.env.CONTROL_PLANE_KEY || '';
const PREFERRED_CHANNEL_KINDS = String(process.env.PREFERRED_CHANNEL_KINDS || 'telegram')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const DATA_DIR = path.resolve(process.env.BOT_DATA_DIR || path.join(__dirname, 'data'));
const ASSET_DIR = path.join(DATA_DIR, 'assets');
const SESSION_FILE = path.join(DATA_DIR, 'sessions.json');

const bot = new TelegramBot(token, { polling: true });

let sessionsByChat = {};
let isSaving = false;
let saveQueued = false;

const UID_RE = /^UID-550W-[A-Za-z0-9_-]{4,}$/;

function nowIso() {
  return new Date().toISOString();
}

function ensureSessionShape(session) {
  return {
    uid: session.uid,
    chatId: session.chatId,
    state: session.state || 'awaiting_data',
    createdAt: session.createdAt || nowIso(),
    updatedAt: nowIso(),
    assets: {
      photos: Array.isArray(session?.assets?.photos) ? session.assets.photos : [],
      audio: Array.isArray(session?.assets?.audio) ? session.assets.audio : []
    },
    handoff: {
      requested: Boolean(session?.handoff?.requested),
      delivered: Boolean(session?.handoff?.delivered),
      error: session?.handoff?.error || null,
      deliveredAt: session?.handoff?.deliveredAt || null,
      allocation: session?.handoff?.allocation || null
    },
    messagesCount: Number(session.messagesCount || 0)
  };
}

async function ensureDirs() {
  await fsp.mkdir(ASSET_DIR, { recursive: true });
}

async function loadSessions() {
  try {
    const raw = await fsp.readFile(SESSION_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const normalized = {};
    for (const [chatId, s] of Object.entries(parsed)) {
      normalized[chatId] = ensureSessionShape(s);
    }
    sessionsByChat = normalized;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('load sessions failed:', err.message);
    }
    sessionsByChat = {};
  }
}

async function flushSessions() {
  if (isSaving) {
    saveQueued = true;
    return;
  }
  isSaving = true;
  try {
    await ensureDirs();
    await fsp.writeFile(SESSION_FILE, JSON.stringify(sessionsByChat, null, 2), 'utf8');
  } finally {
    isSaving = false;
    if (saveQueued) {
      saveQueued = false;
      await flushSessions();
    }
  }
}

function getSession(chatId) {
  return sessionsByChat[String(chatId)] || null;
}

function upsertSession(chatId, data) {
  const key = String(chatId);
  const merged = ensureSessionShape({ ...(sessionsByChat[key] || {}), ...data, chatId: Number(chatId) });
  sessionsByChat[key] = merged;
  void flushSessions();
  return merged;
}

function bindUid(chatId, uid) {
  return upsertSession(chatId, {
    uid,
    state: 'awaiting_data',
    handoff: {
      requested: false,
      delivered: false,
      error: null,
      deliveredAt: null,
      allocation: null
    },
    assets: { photos: [], audio: [] },
    messagesCount: 0
  });
}

async function downloadTelegramFile(fileId, targetPath) {
  const link = await bot.getFileLink(fileId);
  const res = await fetch(link);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.writeFile(targetPath, buf);
  return targetPath;
}

function sessionAssetFolder(uid) {
  return path.join(ASSET_DIR, uid);
}

async function savePhoto(uid, msg) {
  const photos = msg.photo || [];
  if (!photos.length) return null;
  const best = photos[photos.length - 1];
  const fileId = best.file_id;
  const fileName = `${Date.now()}-photo-${fileId}.jpg`;
  const abs = path.join(sessionAssetFolder(uid), fileName);
  await downloadTelegramFile(fileId, abs);
  return {
    kind: 'photo',
    fileId,
    telegramFileUniqueId: best.file_unique_id,
    path: abs,
    ts: nowIso()
  };
}

async function saveAudio(uid, msg) {
  const voice = msg.voice || msg.audio || null;
  if (!voice) return null;
  const fileId = voice.file_id;
  const duration = Number(voice.duration || 0);
  const ext = msg.voice ? 'ogg' : 'mp3';
  const fileName = `${Date.now()}-audio-${fileId}.${ext}`;
  const abs = path.join(sessionAssetFolder(uid), fileName);
  await downloadTelegramFile(fileId, abs);
  return {
    kind: 'audio',
    fileId,
    duration,
    telegramFileUniqueId: voice.file_unique_id,
    path: abs,
    ts: nowIso()
  };
}

async function postControlPlane(pathname, payload) {
  if (!CONTROL_PLANE_BASE_URL) return null;

  const headers = { 'Content-Type': 'application/json' };
  if (CONTROL_PLANE_KEY) {
    headers['x-control-plane-key'] = CONTROL_PLANE_KEY;
  }

  const res = await fetch(`${CONTROL_PLANE_BASE_URL}${pathname}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!res.ok) {
    const reason = data?.error || data?.raw || `status_${res.status}`;
    throw new Error(`control-plane ${pathname} failed: ${reason}`);
  }

  return data;
}

async function syncBindingToControlPlane(uid, msg) {
  if (!CONTROL_PLANE_BASE_URL) return;

  try {
    await postControlPlane('/api/bind', {
      uid,
      chatId: msg.chat.id,
      platform: 'telegram',
      username: msg.from?.username || null,
      userId: msg.from?.id || null
    });
  } catch (err) {
    console.warn('sync binding failed:', String(err.message || err));
  }
}

function hasEnoughAssets(session) {
  const hasPhoto = session.assets.photos.length >= 1;
  const longEnoughAudio = session.assets.audio.some((a) => Number(a.duration || 0) >= MIN_AUDIO_SECONDS);
  return { hasPhoto, longEnoughAudio, done: hasPhoto && longEnoughAudio };
}

async function triggerHandoff(session) {
  const payload = {
    uid: session.uid,
    chatId: session.chatId,
    state: session.state,
    assets: session.assets,
    handoffRequestedAt: nowIso(),
    targetChannel: 'dedicated_session'
  };

  const updated = { ...session };
  updated.handoff.requested = true;
  updated.handoff.allocation = null;

  if (CONTROL_PLANE_BASE_URL) {
    try {
      const data = await postControlPlane('/api/handoff', {
        ...payload,
        preferredKinds: PREFERRED_CHANNEL_KINDS
      });
      updated.handoff.delivered = true;
      updated.handoff.error = null;
      updated.handoff.deliveredAt = nowIso();
      updated.handoff.allocation = data?.assignment || null;
      return updated;
    } catch (err) {
      updated.handoff.error = String(err.message || err);
      console.warn('control-plane handoff failed:', updated.handoff.error);
    }
  }

  if (ORCHESTRATOR_WEBHOOK_URL) {
    try {
      const res = await fetch(ORCHESTRATOR_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        updated.handoff.delivered = false;
        updated.handoff.error = `webhook ${res.status}`;
        return updated;
      }

      updated.handoff.delivered = true;
      updated.handoff.error = null;
      updated.handoff.deliveredAt = nowIso();
      return updated;
    } catch (err) {
      updated.handoff.delivered = false;
      updated.handoff.error = String(err.message || err);
      return updated;
    }
  }

  updated.handoff.delivered = false;
  updated.handoff.error = updated.handoff.error || 'handoff target not configured';
  return updated;
}

async function onAssetsReady(chatId, session) {
  await bot.sendMessage(
    chatId,
    '*[系统处理中]*\n素材接收完成，正在建立独立会话并回传运行时。\n请稍候 10-60 秒。',
    { parse_mode: 'Markdown' }
  );

  let next = { ...session, state: 'handoff_pending' };
  next = await triggerHandoff(next);

  if (next.handoff.delivered) {
    next.state = 'active';
    upsertSession(chatId, next);
    const allocation = next.handoff.allocation || null;
    const lines = [
      '[量子通道建立成功]',
      '已为你分配独立会话。接下来可继续发送需求（图片/语音/地点）。'
    ];
    if (allocation) {
      if (allocation.kind) lines.push(`会话类型：${allocation.kind}`);
      if (allocation.channelId) lines.push(`通道编号：${allocation.channelId}`);
      if (allocation.entrypoint) lines.push(`入口：${allocation.entrypoint}`);
    }
    await bot.sendMessage(
      chatId,
      lines.join('\n')
    );
    return;
  }

  // fallback: stay active in same chat even if external handoff not configured
  next.state = 'active';
  upsertSession(chatId, next);
  console.warn('handoff fallback to same chat:', next.handoff.error || 'unknown');
  await bot.sendMessage(
    chatId,
    '[系统提示]\n独立通道暂时繁忙，已切到当前会话继续体验。'
  );
}

function randomActiveReply() {
  const replies = [
    '我在的，今天也在看新的风景。',
    '我收到啦，我们继续同步记忆。',
    '通道很稳定，你可以继续发想让我看的地方。',
    '我在这边听得到，继续跟我说吧。'
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

async function handleTextBinding(msg, text) {
  const chatId = msg.chat.id;
  const clean = (text || '').trim();
  if (!UID_RE.test(clean)) return false;
  bindUid(chatId, clean);
  await syncBindingToControlPlane(clean, msg);
  await bot.sendMessage(
    chatId,
    `实体标识符: \`${clean}\` 绑定成功。\n请发送：\n📸 一张正面照片\n🎙️ 一段至少 ${MIN_AUDIO_SECONDS} 秒语音`,
    { parse_mode: 'Markdown' }
  );
  return true;
}

bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const uid = (match[1] || '').trim();

  if (!UID_RE.test(uid)) {
    await bot.sendMessage(chatId, 'UID 格式无效。请从网页入口重新进入，或发送形如 UID-550W-XXXX 的标识符。');
    return;
  }

  bindUid(chatId, uid);
  await syncBindingToControlPlane(uid, msg);
  await bot.sendMessage(
    chatId,
    `*[系统提示]* 550W 算力请求已拦截。\n\n实体标识符: \`${uid}\`\n\n为激活基础数字投影，请发送：\n📸 一张正面面部照片\n🎙️ 一段至少 ${MIN_AUDIO_SECONDS} 秒声音样本`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/start$/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    '身份未验证。请从网页点击“免费试用”跳转，或直接发送 UID-550W-XXXX 绑定。'
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text && text.startsWith('/')) return;

  let session = getSession(chatId);

  if (!session) {
    const bound = await handleTextBinding(msg, text);
    if (!bound) {
      await bot.sendMessage(chatId, '请先发送 UID 进行身份绑定（例如 UID-550W-123456）。');
    }
    return;
  }

  // allow rebinding to a new uid anytime
  if (text && UID_RE.test(text.trim())) {
    await handleTextBinding(msg, text);
    return;
  }

  if (session.state === 'awaiting_data' || session.state === 'collecting_assets') {
    let touched = false;

    if (msg.photo) {
      try {
        const saved = await savePhoto(session.uid, msg);
        session.assets.photos.push(saved);
        touched = true;
        await bot.sendMessage(chatId, `已接收照片 1 份（累计 ${session.assets.photos.length}）。`);
      } catch (err) {
        await bot.sendMessage(chatId, `照片接收失败：${String(err.message || err)}`);
      }
    }

    if (msg.voice || msg.audio) {
      try {
        const saved = await saveAudio(session.uid, msg);
        session.assets.audio.push(saved);
        touched = true;
        if ((saved.duration || 0) < MIN_AUDIO_SECONDS) {
          await bot.sendMessage(chatId, `已接收语音（${saved.duration || 0}s），但需至少 ${MIN_AUDIO_SECONDS}s，请再补一段更长语音。`);
        } else {
          await bot.sendMessage(chatId, `已接收语音样本（${saved.duration}s）。`);
        }
      } catch (err) {
        await bot.sendMessage(chatId, `语音接收失败：${String(err.message || err)}`);
      }
    }

    if (!touched) {
      await bot.sendMessage(chatId, '请发送照片或语音样本；当前不接受纯文本作为建模素材。');
      return;
    }

    session.state = 'collecting_assets';
    upsertSession(chatId, session);

    const progress = hasEnoughAssets(session);
    if (!progress.done) {
      const missing = [
        progress.hasPhoto ? null : '照片(>=1)',
        progress.longEnoughAudio ? null : `语音(>=${MIN_AUDIO_SECONDS}s)`
      ].filter(Boolean).join(' + ');
      await bot.sendMessage(chatId, `素材仍缺：${missing}`);
      return;
    }

    await onAssetsReady(chatId, session);
    return;
  }

  if (session.state === 'handoff_pending') {
    await bot.sendMessage(chatId, '素材已收齐，正在分配独立会话，请稍候。');
    return;
  }

  if (session.state === 'active') {
    session.messagesCount += 1;
    upsertSession(chatId, session);
    await bot.sendMessage(chatId, randomActiveReply());
    return;
  }

  await bot.sendMessage(chatId, '当前会话状态异常，请重新发送 UID 绑定。');
});

async function boot() {
  await ensureDirs();
  await loadSessions();
  console.log('550W 量子计算机接入端（Telegram Bot）已启动...');
  console.log(`sessions loaded: ${Object.keys(sessionsByChat).length}`);
}

boot().catch((err) => {
  console.error('boot failed:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await flushSessions();
  process.exit(0);
});
