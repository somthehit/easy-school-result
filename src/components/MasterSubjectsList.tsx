"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMasterSubjectAction, updateMasterSubjectAction } from "@/app/dashboard/subjects/actions";
import LoadingButton from "./LoadingButton";

export interface MasterSubjectItem {
  id: string;
  name: string;
  createdAt?: string | Date | null;
}

export default function MasterSubjectsList({ subjects }: { subjects: MasterSubjectItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(id: string, formData: FormData) {
    setPendingId(id);
    setError(null);
    try {
      const res = await updateMasterSubjectAction(formData);
      if (!res.ok) setError(res.error);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(id: string) {
    setPendingId(id);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("id", id);
      const res = await deleteMasterSubjectAction(fd);
      if (!res.ok) setError(res.error);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to delete");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>
      )}
      {subjects.map((m) => (
        <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{m.name}</div>
              <div className="text-xs text-gray-500">{m.createdAt ? `Created: ${new Date(m.createdAt as any).toLocaleDateString()}` : "\u2014"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <form action={(fd: FormData) => handleUpdate(m.id, fd)} className="flex items-center gap-2">
              <input type="hidden" name="id" value={m.id} />
              <input
                name="name"
                defaultValue={m.name}
                className="h-10 w-56 rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
              <LoadingButton
                type="submit"
                isLoading={pendingId === m.id}
                className="h-10 px-4 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-lg text-sm"
              >
                <>Update</>
              </LoadingButton>
            </form>
            <LoadingButton
              type="button"
              isLoading={pendingId === m.id}
              className="h-10 px-4 bg-white border-2 border-red-200 text-red-600 rounded-lg text-sm"
              onClick={() => handleDelete(m.id)}
            >
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </>
            </LoadingButton>
          </div>
        </div>
      ))}
    </div>
  );
}
