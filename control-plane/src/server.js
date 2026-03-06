require('dotenv').config();
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const PORT = Number(process.env.PORT || 8787);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const TG_BOT_USERNAME = process.env.TG_BOT_USERNAME || 'splandour_550w_bot';
const CONTROL_PLANE_KEY = process.env.CONTROL_PLANE_KEY || '';
const DATA_DIR = path.resolve(process.env.CONTROL_PLANE_DATA_DIR || path.join(__dirname, '..', 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const CHANNEL_POOL_FILE = path.resolve(process.env.CHANNEL_POOL_FILE || path.join(DATA_DIR, 'channel-pool.json'));

let state = createEmptyState();
let isSaving = false;
let saveQueued = false;

function nowIso() {
  return new Date().toISOString();
}

function createEmptyState() {
  return {
    meta: {
      version: 1,
      roundRobinIndex: 0,
      updatedAt: nowIso()
    },
    ordersByUid: {},
    sessionsByUid: {},
    assignmentsByUid: {},
    channelPool: []
  };
}

function uidDateStamp() {
  const d = new Date();
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function issueUid(existing) {
  for (let i = 0; i < 10; i += 1) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const uid = `UID-550W-${uidDateStamp()}-${suffix}`;
    if (!existing[uid]) return uid;
  }
  return `UID-550W-${uidDateStamp()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function normalizeText(value, maxLen = 512) {
  return String(value || '').trim().slice(0, maxLen);
}

function normalizeChannel(channel, index) {
  const c = channel || {};
  return {
    id: normalizeText(c.id, 128) || `channel-${index + 1}`,
    kind: normalizeText(c.kind, 64) || 'custom',
    label: normalizeText(c.label, 128),
    entrypoint: normalizeText(c.entrypoint, 512),
    enabled: c.enabled !== false,
    activeUid: c.activeUid ? normalizeText(c.activeUid, 128) : null,
    assignmentsCount: Number(c.assignmentsCount || 0),
    lastAssignedAt: c.lastAssignedAt || null
  };
}

function normalizeState(raw) {
  const next = createEmptyState();
  next.meta = {
    ...next.meta,
    ...(raw && raw.meta ? raw.meta : {})
  };

  next.ordersByUid = raw && raw.ordersByUid ? raw.ordersByUid : {};
  next.sessionsByUid = raw && raw.sessionsByUid ? raw.sessionsByUid : {};
  next.assignmentsByUid = raw && raw.assignmentsByUid ? raw.assignmentsByUid : {};

  if (Array.isArray(raw && raw.channelPool)) {
    next.channelPool = raw.channelPool.map((item, idx) => normalizeChannel(item, idx));
  }

  return next;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadChannelPoolFromFile() {
  try {
    const raw = await fs.readFile(CHANNEL_POOL_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, idx) => normalizeChannel(item, idx));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('load channel pool failed:', err.message);
    }
    return [];
  }
}

async function loadState() {
  await ensureDir();
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    state = normalizeState(JSON.parse(raw));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('load db failed:', err.message);
    }
    state = createEmptyState();
  }

  if (!Array.isArray(state.channelPool) || !state.channelPool.length) {
    state.channelPool = await loadChannelPoolFromFile();
    await flushState();
  }
}

async function flushState() {
  if (isSaving) {
    saveQueued = true;
    return;
  }

  isSaving = true;
  try {
    await ensureDir();
    state.meta.updatedAt = nowIso();
    await fs.writeFile(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
  } finally {
    isSaving = false;
    if (saveQueued) {
      saveQueued = false;
      await flushState();
    }
  }
}

function upsertSession(uid, patch) {
  const current = state.sessionsByUid[uid] || {
    uid,
    status: 'created',
    source: 'unknown',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    binding: {
      platform: null,
      chatId: null,
      username: null,
      userId: null,
      boundAt: null
    },
    assets: {
      photos: [],
      audio: []
    },
    channel: null
  };

  const merged = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
    binding: {
      ...current.binding,
      ...(patch && patch.binding ? patch.binding : {})
    },
    assets: {
      photos: Array.isArray(patch && patch.assets && patch.assets.photos)
        ? patch.assets.photos
        : current.assets.photos,
      audio: Array.isArray(patch && patch.assets && patch.assets.audio)
        ? patch.assets.audio
        : current.assets.audio
    }
  };

  state.sessionsByUid[uid] = merged;
  return merged;
}

function filterChannels(preferredKinds) {
  const preferred = Array.isArray(preferredKinds)
    ? preferredKinds.map((item) => normalizeText(item, 64)).filter(Boolean)
    : [];

  const enabled = state.channelPool.filter((c) => c.enabled !== false);
  if (!enabled.length) return [];
  if (!preferred.length) return enabled;

  const picked = enabled.filter((c) => preferred.includes(c.kind));
  return picked.length ? picked : enabled;
}

function allocateVirtual(uid, reason = 'no_pool') {
  return {
    uid,
    assignmentId: crypto.randomUUID(),
    strategy: 'virtual_fallback',
    kind: 'virtual',
    channelId: `virtual-${uid}`,
    label: 'Virtual Dedicated Session',
    entrypoint: '',
    reused: false,
    reason,
    allocatedAt: nowIso()
  };
}

function allocateChannel(uid, preferredKinds) {
  const candidates = filterChannels(preferredKinds);
  if (!candidates.length) {
    return allocateVirtual(uid, 'empty_channel_pool');
  }

  const start = Number(state.meta.roundRobinIndex || 0) % candidates.length;
  let picked = null;
  let pickedIndex = -1;

  for (let i = 0; i < candidates.length; i += 1) {
    const idx = (start + i) % candidates.length;
    const c = candidates[idx];
    if (!c.activeUid || c.activeUid === uid) {
      picked = c;
      pickedIndex = idx;
      break;
    }
  }

  let reused = false;
  if (!picked) {
    pickedIndex = start;
    picked = candidates[pickedIndex];
    reused = true;
  }

  picked.activeUid = uid;
  picked.lastAssignedAt = nowIso();
  picked.assignmentsCount = Number(picked.assignmentsCount || 0) + 1;
  state.meta.roundRobinIndex = (pickedIndex + 1) % candidates.length;

  return {
    uid,
    assignmentId: crypto.randomUUID(),
    strategy: 'round_robin',
    kind: picked.kind,
    channelId: picked.id,
    label: picked.label,
    entrypoint: picked.entrypoint,
    reused,
    allocatedAt: nowIso()
  };
}

function releaseChannel(uid) {
  const assignment = state.assignmentsByUid[uid];
  if (!assignment) return false;

  const channel = state.channelPool.find((c) => c.id === assignment.channelId);
  if (channel && channel.activeUid === uid) {
    channel.activeUid = null;
  }

  delete state.assignmentsByUid[uid];
  return true;
}

function internalAuth(req, res, next) {
  if (!CONTROL_PLANE_KEY) {
    return next();
  }

  const incoming = req.header('x-control-plane-key') || '';
  if (incoming !== CONTROL_PLANE_KEY) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  return next();
}

function buildStatus(uid) {
  const order = state.ordersByUid[uid] || null;
  const session = state.sessionsByUid[uid] || null;
  const assignment = state.assignmentsByUid[uid] || null;

  return {
    ok: true,
    uid,
    order,
    session,
    assignment,
    assetsSummary: {
      photos: session && session.assets ? session.assets.photos.length : 0,
      audio: session && session.assets ? session.assets.audio.length : 0
    }
  };
}

async function main() {
  await loadState();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (req, res) => {
    res.json({
      ok: true,
      service: 'digital-life-control-plane',
      now: nowIso(),
      channelPoolSize: state.channelPool.length,
      activeAssignments: Object.keys(state.assignmentsByUid).length
    });
  });

  app.post('/api/apply', async (req, res) => {
    const planType = normalizeText(req.body && req.body.planType, 16) || 'trial';
    const applicant = normalizeText(req.body && req.body.applicant, 128);
    const subject = normalizeText(req.body && req.body.subject, 128);
    const relation = normalizeText(req.body && req.body.relation, 64);
    const message = normalizeText(req.body && req.body.message, 2000);
    const source = normalizeText(req.body && req.body.source, 64) || 'landing';

    if (!applicant || !subject || !relation || !message) {
      return res.status(400).json({ ok: false, error: 'missing required fields' });
    }

    const uid = issueUid(state.ordersByUid);
    const createdAt = nowIso();
    const order = {
      orderId: crypto.randomUUID(),
      uid,
      planType,
      applicant,
      subject,
      relation,
      message,
      source,
      createdAt,
      updatedAt: createdAt
    };

    state.ordersByUid[uid] = order;
    upsertSession(uid, {
      uid,
      status: 'created',
      source,
      createdAt,
      updatedAt: createdAt
    });

    await flushState();

    const deepLink = TG_BOT_USERNAME ? `https://t.me/${TG_BOT_USERNAME}?start=${uid}` : '';

    return res.json({
      ok: true,
      uid,
      orderId: order.orderId,
      telegramDeepLink: deepLink,
      statusUrl: `${PUBLIC_BASE_URL}/api/session/${uid}/status`
    });
  });

  app.post('/api/bind', internalAuth, async (req, res) => {
    const uid = normalizeText(req.body && req.body.uid, 128);
    const platform = normalizeText(req.body && req.body.platform, 32) || 'telegram';
    const username = normalizeText(req.body && req.body.username, 128);
    const userId = normalizeText(req.body && req.body.userId, 64);
    const chatIdRaw = req.body && req.body.chatId;
    const chatId = chatIdRaw === undefined || chatIdRaw === null ? null : String(chatIdRaw);

    if (!uid || !chatId) {
      return res.status(400).json({ ok: false, error: 'uid/chatId required' });
    }

    const prev = state.sessionsByUid[uid] || null;
    const nextStatus = state.assignmentsByUid[uid]
      ? 'allocated'
      : (prev?.status === 'allocated' || prev?.status === 'active' ? prev.status : 'bound');

    const session = upsertSession(uid, {
      status: nextStatus,
      binding: {
        platform,
        chatId,
        username: username || null,
        userId: userId || null,
        boundAt: nowIso()
      }
    });

    await flushState();
    return res.json({ ok: true, uid, sessionStatus: session.status });
  });

  app.post('/api/handoff', internalAuth, async (req, res) => {
    const uid = normalizeText(req.body && req.body.uid, 128);
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid required' });
    }

    const chatIdRaw = req.body && req.body.chatId;
    const chatId = chatIdRaw === undefined || chatIdRaw === null ? null : String(chatIdRaw);

    const preferredKinds = Array.isArray(req.body && req.body.preferredKinds)
      ? req.body.preferredKinds
      : [];

    const assets = req.body && req.body.assets ? req.body.assets : null;
    const prevSession = state.sessionsByUid[uid] || null;
    const patch = {
      status: 'handoff_pending',
      ...(chatId
        ? {
            binding: {
              platform: 'telegram',
              chatId,
              boundAt: nowIso()
            }
          }
        : {})
    };

    const hasIncomingPhotos = Array.isArray(assets && assets.photos);
    const hasIncomingAudio = Array.isArray(assets && assets.audio);
    if (hasIncomingPhotos || hasIncomingAudio) {
      patch.assets = {
        photos: hasIncomingPhotos
          ? assets.photos
          : (prevSession?.assets?.photos || []),
        audio: hasIncomingAudio
          ? assets.audio
          : (prevSession?.assets?.audio || [])
      };
    }

    const session = upsertSession(uid, patch);

    let assignment = state.assignmentsByUid[uid] || null;
    if (!assignment) {
      assignment = allocateChannel(uid, preferredKinds);
      state.assignmentsByUid[uid] = assignment;
    }

    const finalSession = upsertSession(uid, {
      status: 'allocated',
      channel: assignment
    });

    await flushState();

    return res.json({
      ok: true,
      uid,
      sessionStatus: finalSession.status,
      assignment
    });
  });

  app.post('/api/allocate-channel', internalAuth, async (req, res) => {
    const uid = normalizeText(req.body && req.body.uid, 128);
    const forceReallocate = Boolean(req.body && req.body.forceReallocate);
    const preferredKinds = Array.isArray(req.body && req.body.preferredKinds)
      ? req.body.preferredKinds
      : [];

    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid required' });
    }

    let assignment = state.assignmentsByUid[uid] || null;
    if (assignment && !forceReallocate) {
      return res.json({ ok: true, uid, assignment, reusedExisting: true });
    }

    if (assignment && forceReallocate) {
      releaseChannel(uid);
    }

    assignment = allocateChannel(uid, preferredKinds);
    state.assignmentsByUid[uid] = assignment;
    upsertSession(uid, { status: 'allocated', channel: assignment });

    await flushState();

    return res.json({ ok: true, uid, assignment, reusedExisting: false });
  });

  app.post('/api/release-channel', internalAuth, async (req, res) => {
    const uid = normalizeText(req.body && req.body.uid, 128);
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid required' });
    }

    const released = releaseChannel(uid);
    if (released) {
      upsertSession(uid, { status: 'active' });
      await flushState();
    }

    return res.json({ ok: true, uid, released });
  });

  app.get('/api/session/:uid/status', (req, res) => {
    const uid = normalizeText(req.params.uid, 128);
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid required' });
    }

    if (!state.ordersByUid[uid] && !state.sessionsByUid[uid]) {
      return res.status(404).json({ ok: false, error: 'uid not found' });
    }

    return res.json(buildStatus(uid));
  });

  app.get('/api/admin/state', internalAuth, (req, res) => {
    return res.json({
      ok: true,
      meta: state.meta,
      counts: {
        orders: Object.keys(state.ordersByUid).length,
        sessions: Object.keys(state.sessionsByUid).length,
        assignments: Object.keys(state.assignmentsByUid).length,
        channels: state.channelPool.length
      }
    });
  });

  app.listen(PORT, () => {
    console.log(`control-plane listening on ${PORT}`);
    console.log(`db file: ${DB_FILE}`);
    console.log(`channel pool size: ${state.channelPool.length}`);
  });
}

main().catch((err) => {
  console.error('control-plane boot failed:', err);
  process.exit(1);
});
