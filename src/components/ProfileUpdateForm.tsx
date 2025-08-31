"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/actions/profile";

interface User {
  name: string;
  email: string;
  photoUrl?: string | null;
}

interface ProfileUpdateFormProps {
  user: User;
}

export default function ProfileUpdateForm({ user }: ProfileUpdateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await updateProfileAction(formData);
      if (result.ok) {
        router.replace("/dashboard/profile?saved=1");
        router.refresh();
      } else {
        router.replace(`/dashboard/profile?error=${encodeURIComponent(result.error)}`);
        router.refresh();
      }
    } catch (error: any) {
      router.replace(`/dashboard/profile?error=${encodeURIComponent(error.message || "Update failed")}`);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <input 
            name="name" 
            defaultValue={user.name} 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email" 
            value={user.email} 
            disabled 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-gray-50 text-gray-500 cursor-not-allowed" 
          />
          <p className="text-xs text-gray-500">Email cannot be changed</p>
        </div>
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Profile Photo</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-gray-600">Upload Photo</label>
            <input 
              type="file" 
              name="photoFile" 
              accept="image/*" 
              className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-600">Or Photo URL</label>
            <input 
              type="url" 
              name="photoUrl" 
              defaultValue={user.photoUrl || ""} 
              placeholder="https://example.com/photo.jpg" 
              className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200" 
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={isLoading}
          className="px-8 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Update Profile
            </>
          )}
        </button>
      </div>
    </form>
  );
}
