"use client";

import { useState } from "react";
import LoadingButton from "./LoadingButton";
import ImageUpload from "./ImageUpload";

interface ProfileFormProps {
  onSubmit: (formData: FormData) => Promise<any>;
  initialData?: {
    name?: string;
    email?: string;
    schoolName?: string;
    schoolAddress?: string;
    schoolContact?: string;
    estb?: string;
    regNumber?: string;
    principalName?: string;
    principalContact?: string;
    profileImage?: string;
    schoolLogo?: string;
  };
}

export default function ProfileForm({ onSubmit, initialData }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState(initialData?.profileImage || "");
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(initialData?.schoolLogo || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      if (profileImageUrl) {
        formData.append("profileImage", profileImageUrl);
      }
      if (schoolLogoUrl) {
        formData.append("schoolLogo", schoolLogoUrl);
      }
      
      const result = await onSubmit(formData);
      
      if (result?.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProfileImageUpload(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setProfileImageUrl(result);
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleSchoolLogoUpload(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSchoolLogoUrl(result);
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              name="name"
              type="text"
              required
              defaultValue={initialData?.name}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={initialData?.email}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
            <ImageUpload
              onUpload={handleProfileImageUpload}
              currentImage={profileImageUrl}
              label="Upload Profile Photo"
              maxSize={2}
            />
          </div>
        </div>
      </section>

      {/* School Information */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">School Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
            <input
              name="schoolName"
              type="text"
              required
              defaultValue={initialData?.schoolName}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Contact</label>
            <input
              name="schoolContact"
              type="text"
              required
              defaultValue={initialData?.schoolContact}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">School Address</label>
            <textarea
              name="schoolAddress"
              required
              defaultValue={initialData?.schoolAddress}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Establishment Year</label>
            <input
              name="estb"
              type="text"
              required
              defaultValue={initialData?.estb}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
            <input
              name="regNumber"
              type="text"
              required
              defaultValue={initialData?.regNumber}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Principal Name</label>
            <input
              name="principalName"
              type="text"
              required
              defaultValue={initialData?.principalName}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Principal Contact</label>
            <input
              name="principalContact"
              type="text"
              required
              defaultValue={initialData?.principalContact}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">School Logo</label>
            <ImageUpload
              onUpload={handleSchoolLogoUpload}
              currentImage={schoolLogoUrl}
              label="Upload School Logo"
              maxSize={1}
            />
          </div>
        </div>
      </section>

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
          Update Profile
        </LoadingButton>
      </div>
    </form>
  );
}
