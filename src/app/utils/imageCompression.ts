'use client';

type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: 'image/webp' | 'image/jpeg' | 'image/png';
};

const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_MAX_HEIGHT = 1200;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_OUTPUT_TYPE = 'image/webp';

function getCompressedFileName(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';
  return `${baseName}.${extension}`;
}

function getOutputExtension(outputType: string) {
  if (outputType === 'image/webp') {
    return 'webp';
  }

  if (outputType === 'image/png') {
    return 'png';
  }

  return 'jpg';
}

function calculateTargetSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, outputType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Failed to compress image.'));
      },
      outputType,
      quality,
    );
  });
}

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const outputType = options.outputType ?? DEFAULT_OUTPUT_TYPE;
  const bitmap = await createImageBitmap(file);
  const targetSize = calculateTargetSize(bitmap.width, bitmap.height, maxWidth, maxHeight);
  const canvas = document.createElement('canvas');
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Browser cannot process image compression.');
  }

  context.drawImage(bitmap, 0, 0, targetSize.width, targetSize.height);
  bitmap.close();

  const blob = await canvasToBlob(canvas, outputType, quality);
  const extension = getOutputExtension(outputType);

  return new File(
    [blob],
    getCompressedFileName(file.name, extension),
    {
      type: outputType,
      lastModified: Date.now(),
    },
  );
}
