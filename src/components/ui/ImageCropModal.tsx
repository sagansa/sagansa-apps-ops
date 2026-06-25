'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const MAX_OUTPUT_SIZE = 1200;
const ASPECT_RATIO = 1; // 1:1 square

interface ImageCropModalProps {
  file: File | null;
  /** Maximum output resolution (width & height). Defaults to 1200. */
  maxResolution?: number;
  /** Aspect ratio for the crop. Defaults to 1 (square). */
  aspectRatio?: number;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
}

function centerInitialCrop(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
): Crop {
  const crop = centerCrop(
    makeAspectCrop(
      { unit: '%' },
      aspect,
      imageWidth,
      imageHeight,
    ),
    imageWidth,
    imageHeight,
  );
  return crop;
}

export function ImageCropModal({
  file,
  maxResolution = MAX_OUTPUT_SIZE,
  aspectRatio = ASPECT_RATIO,
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load image when file changes
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageSrc(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      imgRef.current = e.currentTarget;
      setNaturalSize({ width: naturalWidth, height: naturalHeight });
      setCrop(centerInitialCrop(naturalWidth, naturalHeight, aspectRatio));
    },
    [aspectRatio],
  );

  const handleConfirm = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !file) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Actual crop dimensions in original image pixels
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

    // Enforce max resolution while keeping aspect ratio
    const outputScale = Math.min(1, maxResolution / cropWidth, maxResolution / cropHeight);
    const outputWidth = Math.max(1, Math.round(cropWidth * outputScale));
    const outputHeight = Math.max(1, Math.round(cropHeight * outputScale));

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onCancel();
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const sourceX = completedCrop.x * scaleX;
    const sourceY = completedCrop.y * scaleY;

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    // Convert to blob then to File
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to create image blob.'))),
        'image/webp',
        0.9,
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const croppedFile = new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });

    onConfirm(croppedFile);
  }, [completedCrop, file, maxResolution, onCancel, onConfirm]);

  if (!file || !imageSrc) return null;

  const cropPixelSize = completedCrop
    ? {
        width: Math.round((completedCrop.width / (imgRef.current?.width || 1)) * naturalSize.width),
        height: Math.round((completedCrop.height / (imgRef.current?.height || 1)) * naturalSize.height),
      }
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Crop Gambar</h3>
            <p className="text-xs text-gray-500">
              Sesuaikan area gambar — rasio 1:1 (persegi). Maks. {maxResolution}×{maxResolution} px.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="text-lg">&#10005;</span>
          </button>
        </div>

        {/* Crop Area */}
        <div className="flex items-center justify-center bg-gray-100 p-4">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            className="max-h-[60vh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              className="max-h-[58vh] max-w-full rounded-md"
              style={{ objectFit: 'contain' }}
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <div className="text-xs text-gray-500">
            {cropPixelSize ? (
              <span>
                Ukuran crop:{' '}
                <span className="font-medium text-gray-700">
                  {Math.min(cropPixelSize.width, maxResolution)}×{Math.min(cropPixelSize.height, maxResolution)}
                </span>{' '}
                px
              </span>
            ) : (
              <span>Pilih area untuk di-crop</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!completedCrop}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Gunakan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}