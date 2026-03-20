import type { SessionSnapshot, WebDemoView } from './types';

export const STORAGE_KEY = 'amberify_web_demo_session_v2';

export function loadSnapshot(): SessionSnapshot | null {
  const params = new URLSearchParams(window.location.search);
  const uid = String(params.get('uid') || '').trim();
  const clientToken = String(params.get('clientToken') || '').trim();
  if (uid && clientToken) {
    return { uid, clientToken, lastWebDemo: null };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveSnapshot(uid: string, clientToken: string, lastWebDemo: WebDemoView | null): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ uid, clientToken, lastWebDemo } satisfies SessionSnapshot));
}

export function clearSnapshot(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
