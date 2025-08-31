"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPasswordAction } from "@/app/actions/auth";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [token, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("");
    setMessage("");
    
    const form = new FormData(e.currentTarget);
    form.append("token", token || "");
    
    const res = await resetPasswordAction(form);
    
    if (res.ok) {
      setMessage(res.message || "Password reset successfully");
      setIsSuccess(true);
    } else {
      setStatus(res.error);
    }
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-100 via-purple-100 to-fuchsia-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 mb-4">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-3 text-black">Password Reset Complete</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <a
              href="/login"
              className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 transition-colors"
            >
              Sign In with New Password
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-100 via-purple-100 to-fuchsia-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-3 text-black">Invalid Reset Link</h1>
            <p className="text-gray-600 mb-6">This password reset link is invalid or has expired.</p>
            <a
              href="/forgot-password"
              className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 transition-colors"
            >
              Request New Reset Link
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-100 via-purple-100 to-fuchsia-100 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden">
        {/* Left marketing panel */}
        <div className="relative hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-purple-700 text-white rounded-l-2xl">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 mb-6">
              <img src="/logo.svg" alt="Easy Result Logo" className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-bold leading-tight">Create New Password</h2>
            <p className="mt-3 text-white/90 max-w-sm">
              Choose a strong password to secure your account. Make sure it's at least 8 characters long.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Minimum 8 characters</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Secure & Encrypted</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Easy to Remember</li>
            </ul>
          </div>
          <div className="opacity-70 text-xs">© {new Date().getFullYear()} Easy School</div>
        </div>
        
        {/* Right form panel */}
        <div className="p-8 md:p-10 bg-white rounded-r-2xl">
          <div className="mb-2 text-sm text-gray-600">Password Recovery</div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-6 text-black">Reset Password</h1>
          
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">New Password</label>
              <PasswordInput 
                name="password" 
                required 
                placeholder="Enter new password (min 8 characters)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Confirm Password</label>
              <PasswordInput 
                name="confirmPassword" 
                required 
                placeholder="Confirm new password"
              />
            </div>
            
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 transition-colors"
            >
              Reset Password
            </button>
          </form>
          
          {status && <p className="mt-3 text-sm text-red-600">{status}</p>}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password? <a className="text-emerald-600 hover:underline" href="/login">Sign in here</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
