"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LoadingButton from "@/components/LoadingButton";

export default function PublicResultLanding() {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setIsLoading(true);
    router.push(`/public-result/${encodeURIComponent(token.trim())}`);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Left info panel */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 md:p-10 text-white flex-col justify-between rounded-l-2xl">
          <div>
            <h2 className="text-3xl font-bold leading-tight">Easy Result</h2>
            <p className="mt-3 text-white/90 max-w-sm">
              View your exam results instantly with our secure token-based system. Get detailed grade breakdowns and performance insights.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Secure Result Access</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Detailed Grade Breakdown</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white"></span> Instant Result Viewing</li>
            </ul>
          </div>
          <div className="opacity-70 text-xs">© {new Date().getFullYear()} Easy School Result</div>
        </div>
        
        {/* Right form panel */}
        <div className="w-full md:w-1/2 p-8 md:p-10 bg-white rounded-r-2xl flex items-center">
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-2 text-sm text-gray-600">Student Portal</div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-6 text-black">Check Your Result</h1>
            
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Result Token</label>
                <input
                  className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter result token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </div>
              
              <LoadingButton
                type="submit"
                isLoading={isLoading}
                className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 transition-colors"
              >
                View Result
              </LoadingButton>
            </form>
            
            <div className="mt-6 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600">
                <strong>Tip:</strong> Your teacher may have shared a link like{" "}
                <code className="px-1 py-0.5 rounded bg-gray-200 text-gray-800 text-xs">/public-result/&lt;token&gt;</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
