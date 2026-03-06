const { nowIso, normalizeText } = require('../lib/utils');

const STATUS_SET = new Set(['queued', 'provisioning', 'ready', 'failed', 'skipped']);

function normalizeRuntimeStatus(input) {
  const raw = normalizeText(input, 32).toLowerCase();
  if (STATUS_SET.has(raw)) return raw;
  if (raw === 'success' || raw === 'ok' || raw === 'active') return 'ready';
  if (raw === 'error' || raw === 'timeout') return 'failed';
  if (raw === 'pending' || raw === 'init') return 'provisioning';
  return 'provisioning';
}

function toRuntimePayload(input = {}) {
  return {
    provider: normalizeText(input.provider, 64) || 'runtime-webhook',
    status: normalizeRuntimeStatus(input.status),
    sessionId: normalizeText(input.sessionId || input.runtimeId, 256) || null,
    entrypoint: normalizeText(input.entrypoint || input.sessionUrl, 1024) || null,
    message: normalizeText(input.message, 1024) || null,
    error: normalizeText(input.error, 1024) || null,
    meta: input.meta && typeof input.meta === 'object' ? input.meta : null,
    updatedAt: nowIso()
  };
}

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function createRuntimeOrchestratorFromEnv() {
  const mode = normalizeText(process.env.RUNTIME_ORCHESTRATOR_MODE || 'none', 32).toLowerCase() || 'none';
  const url = (process.env.RUNTIME_ORCHESTRATOR_URL || '').trim();
  const key = (process.env.RUNTIME_ORCHESTRATOR_KEY || '').trim();
  const timeoutMs = Number(process.env.RUNTIME_ORCHESTRATOR_TIMEOUT_MS || 20000);

  return {
    mode,

    async provision(context) {
      if (mode === 'none') {
        return {
          provider: 'internal',
          status: 'ready',
          sessionId: context?.uid || null,
          entrypoint: context?.assignment?.entrypoint || null,
          message: 'runtime_orchestrator_disabled',
          error: null,
          meta: { mode: 'none' },
          updatedAt: nowIso()
        };
      }

      if (mode !== 'webhook') {
        return {
          provider: 'internal',
          status: 'failed',
          sessionId: null,
          entrypoint: null,
          message: null,
          error: `unsupported_mode:${mode}`,
          meta: { mode },
          updatedAt: nowIso()
        };
      }

      if (!url) {
        return {
          provider: 'runtime-webhook',
          status: 'failed',
          sessionId: null,
          entrypoint: null,
          message: null,
          error: 'RUNTIME_ORCHESTRATOR_URL missing',
          meta: { mode },
          updatedAt: nowIso()
        };
      }

      const payload = {
        event: 'runtime.provision.requested',
        requestedAt: nowIso(),
        uid: context.uid,
        order: context.order || null,
        session: context.session || null,
        assignment: context.assignment || null,
        callbackUrl: context.callbackUrl,
        statusUrl: context.statusUrl
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (key) headers['x-runtime-orchestrator-key'] = key;

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        const data = await parseJsonSafe(res);
        if (!res.ok) {
          return {
            provider: normalizeText(data.provider, 64) || 'runtime-webhook',
            status: 'failed',
            sessionId: null,
            entrypoint: null,
            message: normalizeText(data.message, 1024) || null,
            error: normalizeText(data.error, 1024) || `status_${res.status}`,
            meta: data,
            updatedAt: nowIso()
          };
        }

        return toRuntimePayload(data);
      } catch (err) {
        return {
          provider: 'runtime-webhook',
          status: 'failed',
          sessionId: null,
          entrypoint: null,
          message: null,
          error: normalizeText(err?.message || String(err), 1024),
          meta: { mode },
          updatedAt: nowIso()
        };
      } finally {
        clearTimeout(timer);
      }
    },

    normalizeCallback(body) {
      const data = body && typeof body === 'object' ? body : {};
      const runtime = data.runtime && typeof data.runtime === 'object' ? data.runtime : data;
      return toRuntimePayload(runtime);
    }
  };
}

module.exports = {
  createRuntimeOrchestratorFromEnv,
  normalizeRuntimeStatus
};
