"use client";

import { useState } from "react";
import { changePasswordAction } from "@/app/actions/profile";

export default function PasswordChangeForm() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await changePasswordAction(formData);
      if (result.ok) {
        window.location.href = "/dashboard/profile?saved=1";
      } else {
        window.location.href = `/dashboard/profile?error=${encodeURIComponent(result.error)}`;
      }
    } catch (error: any) {
      window.location.href = `/dashboard/profile?error=${encodeURIComponent(error.message || "Password change failed")}`;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Current Password</label>
          <input 
            type="password" 
            name="currentPassword" 
            required 
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">New Password</label>
          <input 
            type="password" 
            name="newPassword" 
            required 
            minLength={8}
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
              Changing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Change Password
            </>
          )}
        </button>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-blue-800">Password must be at least 8 characters long. Choose a strong password to keep your account secure.</p>
        </div>
      </div>
    </form>
  );
}
