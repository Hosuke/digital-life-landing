const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export interface AppConfig {
  controlPlaneBaseUrl: string;
  manualSchedulingWechat: string;
  manualSchedulingQq: string;
  paidContactEmail: string;
}

export function isLocalHost(): boolean {
  return localHosts.has(window.location.hostname);
}

export function readConfig(): AppConfig {
  const globalConfig = window.DIGITAL_LIFE_CONFIG || {};
  const fallbackBaseUrl = isLocalHost() ? 'http://localhost:8787' : 'https://api.amberify.me';
  return {
    controlPlaneBaseUrl: String(globalConfig.controlPlaneBaseUrl || import.meta.env.VITE_CONTROL_PLANE_BASE_URL || fallbackBaseUrl).trim().replace(/\/+$/, ''),
    manualSchedulingWechat: String(globalConfig.manualSchedulingWechat || import.meta.env.VITE_MANUAL_SCHEDULING_WECHAT || 'q517754526').trim(),
    manualSchedulingQq: String(globalConfig.manualSchedulingQq || import.meta.env.VITE_MANUAL_SCHEDULING_QQ || '517754526').trim(),
    paidContactEmail: String(globalConfig.paidContactEmail || import.meta.env.VITE_PAID_CONTACT_EMAIL || 'sukebeta@outlook.com').trim()
  };
}
