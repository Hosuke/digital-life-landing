export type MessageRole = 'user' | 'assistant' | 'system';
export type VoiceMode = 'cloned' | 'default_mapped';
export type MediaTaskStatus = 'queued' | 'progress' | 'retrying' | 'stored' | 'done' | 'failed';

export interface RecentMessage {
  at: string | null;
  role: MessageRole | string;
  text: string;
  intent: string | null;
  mood: string | null;
  location: string | null;
  render: Record<string, unknown> | null;
}

export interface MediaTaskAsset {
  kind: string | null;
  mediaId: string;
  mimeType: string | null;
  url: string;
  available: boolean;
}

export interface MediaTaskView {
  taskId: string;
  intent: string | null;
  status: MediaTaskStatus;
  error: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  asset: MediaTaskAsset | null;
}

export interface WebDemoView {
  phase: string;
  onboarding: Record<string, any> | null;
  runtime: Record<string, any> | null;
  remainingTurns: number;
  paywallLocked: boolean;
  voiceMode: VoiceMode;
  recentMessages: RecentMessage[];
  pendingMediaTasks: MediaTaskView[];
}

export interface WebDemoSessionResponse {
  ok: boolean;
  uid: string;
  webDemo: WebDemoView;
  reply?: {
    intent: string | null;
    chunks: string[];
    render: Record<string, unknown> | null;
    lifeFollowUp: string | null;
  } | null;
}

export interface ApplyResponse {
  ok: boolean;
  uid: string;
  clientToken: string;
  webDemo: WebDemoView;
}

export interface MediaTasksResponse {
  ok: boolean;
  uid: string;
  tasks: MediaTaskView[];
}

export interface RetryTaskResponse {
  ok: boolean;
  uid: string;
  task: MediaTaskView;
  tasks: MediaTaskView[];
}

export interface ApplyPayload {
  planType: 'trial';
  applicant: string;
  subject: string;
  relation: string;
  role: string;
  soul: string;
  sharedMemory: string;
  currentWish: string;
  preferredCall: string;
  message: string;
  source: string;
}

export interface SessionSnapshot {
  uid: string;
  clientToken: string;
  lastWebDemo: WebDemoView | null;
}

export interface OptimisticMessage {
  id: string;
  role: 'user';
  text: string;
  at: string;
  pending: boolean;
}
