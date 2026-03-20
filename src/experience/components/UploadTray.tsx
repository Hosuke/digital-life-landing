import { useRef, useState } from 'react';

interface UploadTrayProps {
  disabled: boolean;
  busy: boolean;
  onPhotoUpload: (file: File) => Promise<void>;
  onAudioUpload: (file: File) => Promise<void>;
}

export function UploadTray({ disabled, busy, onPhotoUpload, onAudioUpload }: UploadTrayProps) {
  const photoRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLInputElement | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);

  const handlePhoto = async (file: File) => {
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    try {
      await onPhotoUpload(file);
    } catch {
      setPhotoPreview(null);
    }
  };

  const handleAudio = async (file: File) => {
    setAudioName(file.name);
    try {
      await onAudioUpload(file);
    } catch {
      setAudioName(null);
    }
  };

  return (
    <div className="upload-tray">
      <input
        ref={photoRef}
        type="file"
        className="sr-only"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePhoto(file);
          e.target.value = '';
        }}
      />
      <input
        ref={audioRef}
        type="file"
        className="sr-only"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleAudio(file);
          e.target.value = '';
        }}
      />

      <div className="upload-tray__buttons">
        <button
          type="button"
          className="ghost-btn"
          disabled={disabled || busy}
          onClick={() => photoRef.current?.click()}
        >
          {busy ? '上传中...' : '上传照片'}
        </button>
        <button
          type="button"
          className="ghost-btn"
          disabled={disabled || busy}
          onClick={() => audioRef.current?.click()}
        >
          {busy ? '上传中...' : '上传音频'}
        </button>
      </div>

      {(photoPreview || audioName) && (
        <div className="upload-tray__preview">
          {photoPreview && <img src={photoPreview} alt="预览" className="upload-tray__thumb" />}
          {audioName && <span className="upload-tray__file">{audioName}</span>}
        </div>
      )}
    </div>
  );
}
