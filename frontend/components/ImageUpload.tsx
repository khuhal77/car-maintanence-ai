'use client';

import React, { useRef, useState } from 'react';

interface ImageUploadProps {
  onImageSelect: (base64: string) => void;
  loading: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, loading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      onImageSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!preview ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className="rounded p-10 text-center cursor-pointer transition-all duration-150"
          style={{
            border: `1px dashed ${dragActive ? 'var(--accent-signal)' : 'var(--border-hairline)'}`,
            background: dragActive ? 'var(--accent-signal-dim)' : 'transparent',
          }}
        >
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-hairline)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <p className="font-display font-medium text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>
            Drop a part photo here
          </p>
          <p className="text-[13px] mb-5" style={{ color: 'var(--text-tertiary)' }}>
            or select a file — max 5MB
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            disabled={loading}
            className="font-mono text-[12px] uppercase tracking-wider px-5 py-2.5 rounded transition-all"
            style={{
              background: loading ? 'var(--bg-panel-raised)' : 'var(--accent-signal)',
              color: loading ? 'var(--text-tertiary)' : '#0b0f14',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Analyzing…' : 'Browse files'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative w-full rounded overflow-hidden" style={{ border: '1px solid var(--border-hairline)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full h-56 object-cover" style={{ filter: loading ? 'brightness(0.5)' : 'none' }} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider" style={{ color: 'var(--accent-signal)' }}>
                  <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-signal)' }} />
                  Analyzing
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="font-mono text-[11px] truncate max-w-[70%]" style={{ color: 'var(--text-tertiary)' }}>
              {fileName}
            </p>
            {!loading && (
              <button
                onClick={() => {
                  setPreview(null);
                  setFileName('');
                }}
                className="font-mono text-[11px] uppercase tracking-wider hover:underline"
                style={{ color: 'var(--accent-signal)' }}
              >
                Replace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
