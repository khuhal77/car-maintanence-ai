'use client';

import React, { useRef, useState } from 'react';

import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';

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
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {!preview ? (
        <Card
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className="w-full cursor-pointer overflow-hidden border-2 border-dashed transition-all duration-300"
          style={{
            borderColor: dragActive ? 'var(--accent-cyan)' : 'var(--border-hairline-strong)',
            background: dragActive ? 'var(--accent-cyan-dim)' : 'var(--bg-panel-raised)',
          }}
        >
          <CardContent className="p-8 text-center sm:p-10">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-300"
              style={{
                background: 'var(--bg-panel)',
                border: `1.5px solid ${dragActive ? 'var(--accent-cyan)' : 'var(--border-hairline-strong)'}`,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
                <path
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="mb-2 font-display text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>
              Drop your part photo here
            </p>
            <p className="mb-6 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              or select a file — supports JPG, PNG (max 5MB)
            </p>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              disabled={loading}
              className="font-mono text-[12px] font-bold uppercase tracking-wider transition-all duration-200 hover:scale-105"
              style={{
                background: loading ? 'var(--bg-panel)' : 'var(--accent-signal)',
                color: loading ? 'var(--text-tertiary)' : '#0a0c10',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: loading ? '1px solid var(--border-hairline-strong)' : 'none',
              }}
            >
              {loading ? 'Analyzing…' : 'Browse files'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          <Card
            className="overflow-hidden border-2"
            style={{ borderColor: loading ? 'var(--accent-cyan)' : 'var(--border-hairline-strong)' }}
          >
            <AspectRatio ratio={16 / 10} className="relative bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="absolute inset-0 h-full w-full object-cover transition-all duration-300"
                style={{ filter: loading ? 'brightness(0.55) saturate(0.8)' : 'brightness(1)' }}
              />

              {loading && (
                <>
                  <div className="scan-sweep" style={{ top: 0 }} />
                  <div className="absolute inset-0 flex items-center justify-center bg-background/10 backdrop-blur-[1px]">
                    <div className="flex flex-col items-center gap-3">
                      <Skeleton className="h-10 w-28 rounded-full border border-cyan-400/40 bg-[color:var(--accent-cyan-dim)]" />
                      <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent-cyan)' }}>
                        Analyzing
                      </span>
                    </div>
                  </div>
                </>
              )}
            </AspectRatio>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <Tooltip content={fileName || 'Uploaded file'}>
              <div
                className="min-w-0 flex-1 overflow-hidden rounded-lg border px-3 py-2 font-mono text-[12px]"
                style={{
                  color: 'var(--text-tertiary)',
                  background: 'var(--bg-panel-raised)',
                  borderColor: 'var(--border-hairline)',
                }}
              >
                <span className="block truncate break-all">{fileName}</span>
              </div>
            </Tooltip>

            {!loading && (
              <Button
                onClick={() => {
                  setPreview(null);
                  setFileName('');
                }}
                variant="outline"
                className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105"
                style={{
                  color: 'var(--accent-signal)',
                  borderColor: 'var(--accent-signal)',
                  background: 'var(--accent-signal-dim)',
                }}
              >
                Replace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
