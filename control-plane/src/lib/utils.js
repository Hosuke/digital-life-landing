const crypto = require('crypto');
const PAYMENT_STATUS_SET = new Set(['pending', 'paid', 'waived', 'failed', 'refunded', 'canceled']);

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value, maxLen = 512) {
  return String(value || '').trim().slice(0, maxLen);
}

function normalizePlanType(value) {
  return normalizeText(value, 16).toLowerCase() || 'trial';
}

function resolveFreePlanTypes(raw) {
  const source = raw === undefined || raw === null ? 'trial,demo' : String(raw);
  const normalized = source
    .split(',')
    .map((item) => normalizePlanType(item))
    .filter(Boolean);
  return new Set(normalized.length ? normalized : ['trial', 'demo']);
}

function deriveInitialPaymentStatus(planType, freePlanTypes) {
  const normalizedPlan = normalizePlanType(planType);
  const freeSet = freePlanTypes instanceof Set ? freePlanTypes : resolveFreePlanTypes(freePlanTypes);
  return freeSet.has(normalizedPlan) ? 'waived' : 'pending';
}

function normalizePaymentStatus(value, fallback = 'pending') {
  const raw = normalizeText(value, 32).toLowerCase();
  if (PAYMENT_STATUS_SET.has(raw)) return raw;
  if (!fallback) return '';
  const fallbackRaw = normalizeText(fallback, 32).toLowerCase();
  if (PAYMENT_STATUS_SET.has(fallbackRaw)) return fallbackRaw;
  return 'pending';
}

function evaluateHandoffPaymentEligibility(order, options = {}) {
  if (!order) {
    return { allowed: false, reason: 'order_not_found', paymentStatus: 'pending' };
  }

  const requirePaymentForHandoff = options.requirePaymentForHandoff !== false;
  const freeSet = options.freePlanTypes instanceof Set
    ? options.freePlanTypes
    : resolveFreePlanTypes(options.freePlanTypes);
  const planType = normalizePlanType(order.planType);
  const impliedDefault = freeSet.has(planType) ? 'waived' : 'pending';
  const paymentStatus = normalizePaymentStatus(order.paymentStatus, impliedDefault);

  if (!requirePaymentForHandoff) {
    return { allowed: true, reason: 'payment_gate_disabled', paymentStatus };
  }

  if (paymentStatus === 'paid' || paymentStatus === 'waived') {
    return { allowed: true, reason: 'payment_ok', paymentStatus };
  }

  const reasonByStatus = {
    pending: 'payment_pending',
    failed: 'payment_failed',
    refunded: 'payment_refunded',
    canceled: 'payment_canceled'
  };

  return {
    allowed: false,
    reason: reasonByStatus[paymentStatus] || 'payment_required',
    paymentStatus
  };
}

function uidDateStamp() {
  const d = new Date();
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function generateUidCandidate() {
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `UID-550W-${uidDateStamp()}-${suffix}`;
}

function issueUid(existsFn) {
  for (let i = 0; i < 10; i += 1) {
    const uid = generateUidCandidate();
    if (!existsFn(uid)) return uid;
  }
  return `UID-550W-${uidDateStamp()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function normalizeChannel(channel, index = 0) {
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

function defaultSession(uid, source = 'unknown') {
  return {
    uid,
    status: 'created',
    source,
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
    channel: null,
    runtime: null
  };
}

function mergeSession(current, patch) {
  const base = current || defaultSession(patch?.uid || '');
  return {
    ...base,
    ...patch,
    updatedAt: nowIso(),
    binding: {
      ...base.binding,
      ...(patch && patch.binding ? patch.binding : {})
    },
    assets: {
      photos: Array.isArray(patch && patch.assets && patch.assets.photos)
        ? patch.assets.photos
        : base.assets.photos,
      audio: Array.isArray(patch && patch.assets && patch.assets.audio)
        ? patch.assets.audio
        : base.assets.audio
    }
  };
}

module.exports = {
  nowIso,
  normalizeText,
  normalizePlanType,
  resolveFreePlanTypes,
  deriveInitialPaymentStatus,
  normalizePaymentStatus,
  evaluateHandoffPaymentEligibility,
  generateUidCandidate,
  issueUid,
  normalizeChannel,
  defaultSession,
  mergeSession
};
