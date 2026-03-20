import { useRef, useState } from 'react';

interface UploadTrayProps {
  disabled: boolean;
  onPhotoUpload: (file: File) => Promise<void>;
  onAudioUpload: (file: File) => Promise<void>;
  onInlineState: (message: string) => void;
}

export function UploadTray({ disabled, onPhotoUpload, onAudioUpload, onInlineState }: UploadTrayProps) {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);

  const startOrStopRecording = async () => {
    if (disabled) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onInlineState('当前浏览器不支持录音，请直接上传音频文件。');
      return;
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const nextChunks: Blob[] = [];
      setChunks([]);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          nextChunks.push(event.data);
        }
      };
      recorder.onstop = async () => {
        setRecording(false);
        setMediaRecorder(null);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(nextChunks, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) {
          onInlineState('录音没有拿到有效内容。');
          return;
        }
        const file = new File([blob], 'browser-recording.webm', { type: blob.type || 'audio/webm' });
        await onAudioUpload(file);
      };
      recorder.start();
      setChunks(nextChunks);
      setMediaRecorder(recorder);
      setRecording(true);
      onInlineState('正在录音，再点一次按钮会停止并直接上传。');
    } catch (error) {
      onInlineState(`无法启动录音：${error instanceof Error ? error.message : 'unknown_error'}`);
    }
  };

  return (
    <div className="upload-tray">
      <input
        ref={photoInputRef}
        type="file"
        className="hidden-input"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onPhotoUpload(file);
          }
          event.target.value = '';
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        className="hidden-input"
        accept="audio/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onAudioUpload(file);
          }
          event.target.value = '';
        }}
      />
      <button type="button" className="ghost-btn" disabled={disabled} onClick={() => photoInputRef.current?.click()}>
        上传参考图
      </button>
      <button type="button" className="ghost-btn" disabled={disabled} onClick={() => audioInputRef.current?.click()}>
        上传音频
      </button>
      <button type="button" className="ghost-btn" disabled={disabled} onClick={() => void startOrStopRecording()}>
        {recording ? '停止录音并上传' : '浏览器录音'}
      </button>
    </div>
  );
}
