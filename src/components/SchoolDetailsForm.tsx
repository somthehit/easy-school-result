"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSchoolDetailsAction } from "@/app/actions/profile";

interface User {
  schoolName?: string | null;
  regNumber?: string | null;
  schoolLogo?: string | null;
  schoolAddress?: string | null;
  estb?: string | null;
  schoolContact?: string | null;
  principalName?: string | null;
  principalContact?: string | null;
}

interface SchoolDetailsFormProps {
  user: User;
}

export default function SchoolDetailsForm({ user }: SchoolDetailsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await updateSchoolDetailsAction(formData);
      if (result.ok) {
        router.replace("/dashboard/profile/settings?saved=1");
        router.refresh();
      } else {
        router.replace(`/dashboard/profile/settings?error=${encodeURIComponent(result.error)}`);
        router.refresh();
      }
    } catch (error: any) {
      router.replace(`/dashboard/profile/settings?error=${encodeURIComponent(error.message || "Update failed")}`);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">School Name</label>
          <input 
            name="schoolName" 
            defaultValue={user.schoolName || ""} 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Registration Number</label>
          <input 
            name="regNumber" 
            defaultValue={user.regNumber || ""} 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
          />
        </div>
      </div>

      {/* School Logo Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">School Logo</label>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            {user.schoolLogo ? (
              <div className="flex flex-col items-center space-y-3">
                <img 
                  src={user.schoolLogo} 
                  alt="School Logo" 
                  className="w-24 h-24 object-contain rounded-xl border-2 border-gray-200 bg-white p-2"
                />
                <p className="text-xs text-gray-500">Current Logo</p>
              </div>
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-600">Upload Logo File</label>
              <input 
                type="file" 
                name="schoolLogoFile" 
                accept="image/*" 
                className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-600">Or Logo URL</label>
              <input 
                type="url" 
                name="schoolLogo" 
                defaultValue={user.schoolLogo || ""} 
                placeholder="https://example.com/logo.png" 
                className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
              />
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-blue-800">Recommended: Square logo, 200x200px minimum. Supports PNG, JPG, SVG formats.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">School Address</label>
        <textarea 
          name="schoolAddress" 
          defaultValue={user.schoolAddress || ""} 
          required 
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Establishment Year</label>
          <input 
            name="estb" 
            defaultValue={user.estb || ""} 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">School Contact</label>
          <input 
            name="schoolContact" 
            defaultValue={user.schoolContact || ""} 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Principal Name</label>
          <input 
            name="principalName" 
            defaultValue={user.principalName || ""} 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Principal Contact</label>
          <input 
            name="principalContact" 
            defaultValue={user.principalContact || ""} 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={isLoading}
          className="px-8 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
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
              Update School Details
            </>
          )}
        </button>
      </div>
    </form>
  );
}
