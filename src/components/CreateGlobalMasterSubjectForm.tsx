"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGlobalMasterSubject } from "@/app/dashboard/subjects/actions";
import LoadingButton from "./LoadingButton";

export default function CreateGlobalMasterSubjectForm() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleAction(formData: FormData) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createGlobalMasterSubject(formData);
      if (res.ok) {
        setName("");
        router.replace("/dashboard/profile/settings?saved=1");
        router.refresh();
      } else {
        setError(res.error);
        router.replace(`/dashboard/profile/settings?error=${encodeURIComponent(res.error)}`);
        router.refresh();
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to create major subject";
      setError(msg);
      router.replace(`/dashboard/profile/settings?error=${encodeURIComponent(msg)}`);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Major Subject Name</label>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Science, Mathematics, English"
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
          />
        </div>
        <div className="flex items-end">
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </>
          </LoadingButton>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-blue-800">Major subjects are global templates available for all classes. No marks are defined here - marks will be set when creating exams for specific subjects.</p>
        </div>
      </div>
    </form>
  );
}
