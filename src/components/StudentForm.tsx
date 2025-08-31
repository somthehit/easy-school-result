"use client";

import { useState } from "react";
import LoadingButton from "./LoadingButton";
import ImageUpload from "./ImageUpload";

interface StudentFormProps {
  classes: any[];
  onSubmit: (formData: FormData) => Promise<any>;
  initialData?: {
    id?: string;
    name?: string;
    rollNumber?: string;
    classId?: string;
    photo?: string;
  };
  mode?: "create" | "edit";
}

export default function StudentForm({ 
  classes, 
  onSubmit, 
  initialData, 
  mode = "create" 
}: StudentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState(initialData?.photo || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      if (photoUrl) {
        formData.append("photo", photoUrl);
      }
      
      const result = await onSubmit(formData);
      
      if (result?.error) {
        setError(result.error);
      } else {
        if (mode === "create") {
          e.currentTarget.reset();
          setPhotoUrl("");
        }
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} student`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImageUpload(file: File): Promise<string> {
    // Mock upload - replace with actual upload logic
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPhotoUrl(result);
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {initialData?.id && (
        <input type="hidden" name="id" value={initialData.id} />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Name
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={initialData?.name}
              placeholder="Enter student's full name"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roll Number
            </label>
            <input
              name="rollNumber"
              type="text"
              required
              defaultValue={initialData?.rollNumber}
              placeholder="Enter roll number"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class
            </label>
            <select
              name="classId"
              required
              defaultValue={initialData?.classId}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section ? `- ${c.section}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column - Photo Upload */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Photo
            </label>
            <ImageUpload
              onUpload={handleImageUpload}
              currentImage={photoUrl}
              label="Upload Photo"
              maxSize={2}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <LoadingButton
          type="submit"
          isLoading={isLoading}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {mode === "create" ? "Add Student" : "Update Student"}
        </LoadingButton>
      </div>
    </form>
  );
}
