"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";
import LoadingButton from "@/components/LoadingButton";
import { signupAction } from "@/app/actions/auth";

export default function SignupPage() {
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setStatus("");
    
    try {
      const formEl = e.currentTarget;
      const form = new FormData(formEl);
      const res = await signupAction(form);
      if (res.ok) {
        const email = String(form.get("email") ?? "");
        setStatus("Signup successful. Redirecting to verification page...");
        formEl.reset();
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      } else {
        setStatus(res.error);
      }
    } finally {
      setIsLoading(false);
    }
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
            <h2 className="text-3xl font-bold leading-tight">Easy Result</h2>
            <p className="mt-3 text-white/90 max-w-sm">
              Join thousands of teachers creating professional exam results. Build beautiful grade cards and share results instantly with students and parents.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Professional Result Cards</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Instant Result Publishing</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Parent-Student Access</li>
            </ul>
          </div>
          <div className="opacity-70 text-xs">© {new Date().getFullYear()} Easy School Result</div>
        </div>
        {/* Right form panel */}
        <div className="p-8 md:p-10 bg-white rounded-r-2xl">
          <div className="mb-2 text-sm text-gray-600">Create your account</div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-6 text-black">Sign Up</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Email</label>
              <input type="email" name="email" required className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Password</label>
              <PasswordInput name="password" required placeholder="Enter a strong password" />
            </div>
            <LoadingButton type="submit" isLoading={isLoading} className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 transition-colors">Continue</LoadingButton>
          </form>
          {status && <p className="mt-3 text-sm text-emerald-600">{status}</p>}
          <p className="mt-6 text-sm text-gray-600">
            Already have an account? <a className="text-emerald-600 hover:underline" href="/login">Sign in</a>
          </p>
        </div>
      </div>
    </main>
  );
}

