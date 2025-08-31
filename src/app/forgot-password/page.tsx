"use client";

import { useState } from "react";
import LoadingButton from "@/components/LoadingButton";
import { forgotPasswordAction } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setStatus("");
    setMessage("");
    
    try {
      const form = new FormData(e.currentTarget);
      const res = await forgotPasswordAction(form);
      
      if (res.ok) {
        setMessage(res.message || "Reset link sent to your email");
        setIsSubmitted(true);
      } else {
        setStatus(res.error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-100 via-purple-100 to-fuchsia-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 mb-4">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-3 text-black">Check Your Email</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <a
                href="/login"
                className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 transition-colors"
              >
                Back to Sign In
              </a>
              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full text-sm text-emerald-600 hover:underline"
              >
                Try different email
              </button>
            </div>
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
            <h2 className="text-3xl font-bold leading-tight">Reset Your Password</h2>
            <p className="mt-3 text-white/90 max-w-sm">
              Enter your email address and we'll send you a secure link to reset your password.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Secure Reset Process</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Email Verification</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Quick & Easy</li>
            </ul>
          </div>
          <div className="opacity-70 text-xs">© {new Date().getFullYear()} Easy School</div>
        </div>
        
        {/* Right form panel */}
        <div className="p-8 md:p-10 bg-white rounded-r-2xl">
          <div className="mb-2 text-sm text-gray-600">Password Recovery</div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-6 text-black">Forgot Password?</h1>
          
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your registered email"
                required
                className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <LoadingButton
              type="submit"
              isLoading={isLoading}
              className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 transition-colors"
            >
              Send Reset Link
            </LoadingButton>
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
