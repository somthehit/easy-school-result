"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { completeProfileAction } from "@/app/actions/auth";

export default function CompleteProfilePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const email = sp.get("email") ?? "";

  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) {
      setStatus("Missing email. Please start from signup.");
      return;
    }
    
    setLoading(true);
    setStatus("");
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    form.set("email", email);
    
    const res = await completeProfileAction(form);
    setLoading(false);
    
    if (res.ok) {
      setStatus("Profile completed! Redirecting to dashboard...");
      setTimeout(() => router.push("/dashboard"), 1200);
    } else {
      setStatus(res.error);
    }
  }

  if (!email) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-100 via-purple-100 to-fuchsia-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-semibold mb-4 text-black">Missing Information</h1>
          <p className="text-gray-600 mb-6">Please start from the signup page.</p>
          <a href="/signup" className="inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 transition-colors">
            Go to Signup
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-100 via-purple-100 to-fuchsia-100 p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Easy Result Logo" className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-3xl font-semibold mb-2 text-black">Complete Your Profile</h1>
          <p className="text-gray-600">Tell us about your school to get started</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Teacher Name</label>
              <input 
                name="name" 
                required 
                className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-black">School Name</label>
              <input 
                name="schoolName" 
                required 
                className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                placeholder="School name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">School Address</label>
            <textarea 
              name="schoolAddress" 
              required 
              rows={3}
              className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              placeholder="Complete school address"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">School Contact</label>
              <input 
                name="schoolContact" 
                required 
                className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Establishment Date</label>
              <input 
                name="estb" 
                required 
                className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                placeholder="e.g., 1995"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Registration Number</label>
              <input 
                name="regNumber" 
                required 
                className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                placeholder="School registration number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Principal Name</label>
              <input 
                name="principalName" 
                required 
                className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                placeholder="Principal's full name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Principal Contact</label>
            <input 
              name="principalContact" 
              required 
              className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              placeholder="Principal's phone number"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-3 transition-colors disabled:opacity-60"
          >
            {loading ? "Creating Profile..." : "Complete Profile & Continue"}
          </button>
        </form>

        {status && (
          <div className="mt-4 p-3 rounded-md bg-emerald-50 border border-emerald-200">
            <p className="text-sm text-emerald-700">{status}</p>
          </div>
        )}
      </div>
    </main>
  );
}
