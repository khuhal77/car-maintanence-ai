'use client';

/**
 * Image Upload Component
 * Handles image upload from user
 */

import React, { useRef, useState } from 'react';

interface ImageUploadProps {
  onImageSelect: (base64: string) => void;
  loading: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, loading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  return (
    <div className="w-full max-w-md">
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
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200
            ${
              loading
                ? 'border-gray-300 bg-gray-50'
                : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50'
            }
          `}
        >
          <div className="text-4xl mb-3">📸</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            Upload Car Part Photo
          </h3>
          <p className="text-sm text-gray-600 mb-3">Drag and drop or click to select</p>
          <p className="text-xs text-gray-500">JPG, PNG, GIF or WebP (Max 5MB)</p>

          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className={`
              mt-4 px-6 py-2 rounded-lg font-medium transition-all
              ${
                loading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }
            `}
          >
            {loading ? '🔄 Analyzing...' : 'Select Photo'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">
              <strong>File:</strong> {fileName}
            </p>
            <p className="text-xs text-gray-500">
              Click button below to analyze or{' '}
              <button
                onClick={() => {
                  setPreview(null);
                  setFileName('');
                }}
                className="text-indigo-600 hover:underline ml-1"
              >
                choose another photo
              </button>
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center space-x-2 text-indigo-600">
              <div className="animate-spin">⚙️</div>
              <p className="font-medium">Analyzing car part...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
