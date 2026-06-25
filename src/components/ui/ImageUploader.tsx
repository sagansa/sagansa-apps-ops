'use client';

import { useRef, useState, useCallback } from 'react';
import { ImageCropModal } from './ImageCropModal';

interface ImageUploaderProps {
  /** Existing image URL to display (e.g. from product.imageUrl) */
  currentImageUrl?: string | null;
  /** Callback when user selects a new file */
  onFileSelect: (file: File | null) => void;
  /** Callback when user removes the existing image */
  onRemove?: () => void;
  /** Whether we're in "edit" mode with an existing image */
  hasExistingImage?: boolean;
  /** Enable crop modal before accepting the file (default: true) */
  enableCrop?: boolean;
  /** Maximum output resolution when cropping (default: 1200) */
  maxResolution?: number;
  /** Aspect ratio for crop (default: 1 = square) */
  cropAspectRatio?: number;
  className?: string;
}

export function ImageUploader({
  currentImageUrl,
  onFileSelect,
  onRemove,
  hasExistingImage = false,
  enableCrop = true,
  maxResolution = 1200,
  cropAspectRatio = 1,
  className,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);
  // Pending file for crop modal
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const displayUrl = previewUrl || (!isRemoved ? currentImageUrl : null);

  const applyFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsRemoved(false);
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleRawFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;

      if (enableCrop) {
        // Open crop modal — don't apply yet
        setPendingFile(file);
      } else {
        applyFile(file);
      }
    },
    [enableCrop, applyFile],
  );

  const handleCropConfirm = useCallback(
    (croppedFile: File) => {
      setPendingFile(null);
      applyFile(croppedFile);
    },
    [applyFile],
  );

  const handleCropCancel = useCallback(() => {
    setPendingFile(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleRawFile(file);
    },
    [handleRawFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleRawFile(file);
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleRawFile],
  );

  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setIsRemoved(true);
    onFileSelect(null);
    onRemove?.();
  }, [previewUrl, onFileSelect, onRemove]);

  return (
    <div className={className}>
      {displayUrl ? (
        <div className="group relative inline-block">
          <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          </div>
          {/* Overlay actions on hover */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors duration-200 ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }`}
        >
          <svg
            className="mb-2 h-8 w-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-600">
            Click to upload or drag & drop
          </p>
          <p className="mt-1 text-xs text-gray-400">
            PNG, JPG, WEBP{enableCrop ? ' — akan di-crop 1:1' : ' (auto-converted)'}
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Crop Modal */}
      {enableCrop && (
        <ImageCropModal
          file={pendingFile}
          maxResolution={maxResolution}
          aspectRatio={cropAspectRatio}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}