'use client';

import React, { useRef, useState } from 'react';

interface ImageUploadProps {
  onImageSelect: (base64: string) => void;
  loading: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, loading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const processFile = (file: File) => {
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB.');
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

  const clearSelection = () => {
    if (loading) return;
    setPreview(null);
    setFileName('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
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
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!loading) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={loading ? -1 : 0}
          onKeyDown={(e) => {
            if (!loading && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`group rounded-3xl border-2 border-dashed p-6 text-center transition duration-200 sm:p-10 ${
            loading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
          }`}
          style={{
            borderColor: dragActive
              ? 'var(--accent-signal)'
              : 'color-mix(in srgb, var(--text-primary) 12%, transparent)',
            background: dragActive
              ? 'color-mix(in srgb, var(--accent-signal) 6%, transparent)'
              : 'color-mix(in srgb, var(--text-primary) 2.5%, transparent)',
          }}
        >
          {/* <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl transition group-hover:-translate-y-0.5"
            style={{
              background: 'color-mix(in srgb, var(--accent-signal) 9%, transparent)',
              color: 'var(--accent-signal)',
              border: '1px solid color-mix(in srgb, var(--accent-signal) 15%, transparent)',
            }}
          >
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16.5 8.2 12a2 2 0 0 1 2.9 0l1.4 1.5 1.6-1.8a2 2 0 0 1 3 0l2.9 3.1M7 8h.01M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            </svg>
          </div> */}

          <h3 className="mt-5 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Upload a photo of the vehicle part
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6" style={{ color: 'var(--text-tertiary)' }}>
            Drag and drop an image here, or browse from your device. JPG, PNG and other common image formats are supported.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}>
              Max 5MB
            </span>
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}>
              Fast analysis
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!loading) inputRef.current?.click();
            }}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--accent-signal)' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14" />
            </svg>
            {loading ? 'Analyzing image…' : 'Choose image'}
          </button>

          {error && (
            <p className="mt-4 text-sm font-medium" style={{ color: 'var(--status-high)' }} role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 9%, transparent)' }}>
          <div className="relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`Preview of ${fileName}`}
              className="h-64 w-full object-cover sm:h-80"
              style={{ filter: loading ? 'brightness(0.68) blur(1px)' : undefined }}
            />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                <div className="rounded-2xl border bg-white/90 px-5 py-4 text-center shadow-xl dark:bg-slate-900/90">
                  <div className="mb-2 flex justify-center gap-1.5">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="h-2 w-2 animate-bounce rounded-full"
                        style={{ background: 'var(--accent-signal)', animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Analyzing image…
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Identifying the part and possible issue
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {fileName}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {loading ? 'Analysis in progress' : 'Image ready for analysis'}
              </p>
            </div>

            {!loading && (
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5"
                style={{
                  borderColor: 'color-mix(in srgb, var(--text-primary) 9%, transparent)',
                  color: 'var(--text-primary)',
                }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
                </svg>
                Replace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
