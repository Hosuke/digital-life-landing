import type {
  ApplyPayload,
  ApplyResponse,
  MediaTasksResponse,
  RetryTaskResponse,
  WebDemoSessionResponse
} from './types';

export interface ApiClientOptions {
  baseUrl: string;
  uid?: string;
  clientToken?: string;
}

export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload: any) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function withTokenHeaders(clientToken?: string): HeadersInit {
  return clientToken ? { 'x-web-demo-token': clientToken } : {};
}

async function parseJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function request<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = await parseJson(response);
  if (!response.ok) {
    throw new ApiError(payload.error || `request_failed:${response.status}`, response.status, payload);
  }
  return payload as T;
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const uid = options.uid || '';
  const clientToken = options.clientToken || '';

  return {
    apply(payload: ApplyPayload) {
      return request<ApplyResponse>(baseUrl, '/api/web-demo/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
    },
    getSession() {
      return request<WebDemoSessionResponse>(baseUrl, `/api/web-demo/session/${encodeURIComponent(uid)}`, {
        headers: withTokenHeaders(clientToken)
      });
    },
    getMediaTasks() {
      return request<MediaTasksResponse>(baseUrl, `/api/web-demo/session/${encodeURIComponent(uid)}/media-tasks`, {
        headers: withTokenHeaders(clientToken)
      });
    },
    sendMessage(text: string) {
      return request<WebDemoSessionResponse>(baseUrl, `/api/web-demo/session/${encodeURIComponent(uid)}/message`, {
        method: 'POST',
        headers: {
          ...withTokenHeaders(clientToken),
          'content-type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
    },
    retryTask(taskId: string) {
      return request<RetryTaskResponse>(baseUrl, `/api/web-demo/session/${encodeURIComponent(uid)}/media-tasks/${encodeURIComponent(taskId)}/retry`, {
        method: 'POST',
        headers: withTokenHeaders(clientToken)
      });
    },
    uploadAsset(kind: 'photo' | 'audio', body: Record<string, unknown>) {
      return request<WebDemoSessionResponse>(baseUrl, `/api/web-demo/session/${encodeURIComponent(uid)}/assets/${kind}`, {
        method: 'POST',
        headers: {
          ...withTokenHeaders(clientToken),
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    }
  };
}

export async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });
}
