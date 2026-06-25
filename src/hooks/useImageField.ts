'use client';

import { useState, useCallback } from 'react';

interface UseImageFieldOptions {
  /** Current image URL to display (e.g. from server data) */
  currentImageUrl?: string | null;
  /** Whether an image already exists on the server */
  hasExistingImage?: boolean;
}

interface UseImageFieldReturn {
  /** The selected file (if user picked a new image) */
  file: File | null;
  /** Whether the user explicitly removed the existing image */
  shouldRemove: boolean;
  /** Current image URL for display */
  currentImageUrl: string | null;
  /** Whether an image already exists on the server */
  hasExistingImage: boolean;
  /** Reset the field to initial state */
  reset: () => void;
  /** Props that can be spread directly onto <ImageUploader /> */
  uploaderProps: {
    currentImageUrl: string | null;
    hasExistingImage: boolean;
    onFileSelect: (file: File | null) => void;
    onRemove: () => void;
  };
}

/**
 * Reusable hook for managing a single image upload field.
 *
 * Usage:
 * ```tsx
 * const logo = useImageField({ currentImageUrl: store?.logo_url, hasExistingImage: !!store?.logo_url });
 *
 * <ImageUploader {...logo.uploaderProps} />
 *
 * // On submit:
 * if (logo.file) await uploadImage(logo.file);
 * if (logo.shouldRemove) payload.remove_logo = true;
 * ```
 */
export function useImageField(
  { currentImageUrl, hasExistingImage }: UseImageFieldOptions = {
    currentImageUrl: null,
    hasExistingImage: false,
  },
): UseImageFieldReturn {
  const [file, setFile] = useState<File | null>(null);
  const [shouldRemove, setShouldRemove] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile) {
      setShouldRemove(false);
    }
  }, []);

  const handleRemove = useCallback(() => {
    if (hasExistingImage) {
      setShouldRemove(true);
    }
  }, [hasExistingImage]);

  const reset = useCallback(() => {
    setFile(null);
    setShouldRemove(false);
  }, []);

  return {
    file,
    shouldRemove,
    currentImageUrl: currentImageUrl ?? null,
    hasExistingImage: !!hasExistingImage,
    reset,
    uploaderProps: {
      currentImageUrl: currentImageUrl ?? null,
      hasExistingImage: !!hasExistingImage,
      onFileSelect: handleFileSelect,
      onRemove: handleRemove,
    },
  };
}