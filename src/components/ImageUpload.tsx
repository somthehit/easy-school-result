"use client";

import { useState, useRef } from "react";
import LoadingButton from "./LoadingButton";

interface ImageUploadProps {
  onUpload: (file: File) => Promise<string>;
  currentImage?: string;
  label?: string;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export default function ImageUpload({
  onUpload,
  currentImage,
  label = "Upload Image",
  accept = "image/*",
  maxSize = 5,
  className = ""
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      const uploadedUrl = await onUpload(file);
      setPreview(uploadedUrl);
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
      setPreview(currentImage || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreview(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
              <div className="text-white text-sm">Uploading...</div>
            </div>
          )}
          <button
            onClick={handleRemove}
            disabled={isUploading}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors">
          <div className="text-center">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-xs text-gray-500">No image</p>
          </div>
        </div>
      )}

      <LoadingButton
        onClick={handleButtonClick}
        isLoading={isUploading}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
      >
        {preview ? "Change Image" : label}
      </LoadingButton>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <p className="text-xs text-gray-500">
        Max file size: {maxSize}MB. Supported formats: JPG, PNG, GIF
      </p>
    </div>
  );
}
