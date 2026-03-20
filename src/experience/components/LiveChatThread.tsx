import { useMemo } from 'react';
import { useLocalRuntime, type ChatModelRunOptions, type ThreadMessageLike } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react-ui';
import type { RecentMessage, WebDemoSessionResponse, WebDemoView } from '../lib/types';
import { createApiClient } from '../lib/api';

interface LiveChatThreadProps {
  baseUrl: string;
  uid: string;
  clientToken: string;
  webDemo: WebDemoView | null;
  onSessionUpdate: (data: WebDemoSessionResponse) => void;
  onInlineState: (message: string) => void;
}

function messageText(message: RecentMessage): string {
  return String(message.text || '').trim();
}

function toInitialMessages(messages: RecentMessage[] = []): ThreadMessageLike[] {
  return messages
    .filter((message) => messageText(message))
    .map((message, index) => ({
      id: `history-${index}-${message.at || 'na'}`,
      role: String(message.role || 'assistant') === 'user' ? 'user' : String(message.role || 'assistant') === 'system' ? 'system' : 'assistant',
      content: messageText(message),
      createdAt: message.at ? new Date(message.at) : undefined
    }));
}

function extractLatestUserText(messages: readonly { role?: string; content?: readonly { type?: string; text?: string }[] }[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (String(message?.role || '') !== 'user') continue;
    const content = Array.isArray(message?.content) ? message.content : [];
    const parts = content
      .filter((part: { type?: string; text?: string }) => part?.type === 'text' && typeof part?.text === 'string')
      .map((part: { text?: string }) => String(part.text || '').trim())
      .filter(Boolean);
    if (parts.length) return parts.join('\n');
  }
  return '';
}

export function LiveChatThread({
  baseUrl,
  uid,
  clientToken,
  webDemo,
  onSessionUpdate,
  onInlineState
}: LiveChatThreadProps) {
  const initialMessages = useMemo(() => toInitialMessages(webDemo?.recentMessages || []), [webDemo?.recentMessages]);

  const runtime = useLocalRuntime(useMemo(() => ({
    async run(options: ChatModelRunOptions) {
      const text = extractLatestUserText(options.messages);
      if (!text) {
        return {
          content: [{ type: 'text', text: '这次没有读到有效内容，你可以再发一次。' }],
          status: { type: 'complete', reason: 'stop' }
        };
      }

      onInlineState('消息已送出，正在等待角色回复...');
      const api = createApiClient({ baseUrl, uid, clientToken });
      const data = await api.sendMessage(text);
      onSessionUpdate(data);
      onInlineState(data.reply?.chunks?.length
        ? '已收到角色回复。若触发图片、语音、视频任务，会继续在下方回填。'
        : '消息已处理。');

      const contentText = (data.reply?.chunks || [])
        .map((chunk) => String(chunk || '').trim())
        .filter(Boolean)
        .join('\n\n') || '我收到了。';

      return {
        content: [{ type: 'text', text: contentText }],
        status: { type: 'complete', reason: 'stop' }
      };
    }
  }), [baseUrl, clientToken, onInlineState, onSessionUpdate, uid]), {
    initialMessages
  });

  return (
    <div className="assistant-thread-shell">
      <Thread
        runtime={runtime}
        welcome={{
          message: '现在已经进入 live。接下来会按角色本人来回应你。'
        }}
      />
    </div>
  );
}
