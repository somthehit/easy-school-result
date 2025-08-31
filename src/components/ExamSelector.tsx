"use client";

import React from "react";

export default function ExamSelector({
  exams,
  currentExamId,
  preserveQuery,
}: {
  exams: Array<{ id: string; name: string; term?: string | null; year?: number | null }>;
  currentExamId: string;
  preserveQuery?: Record<string, string | undefined | null>;
}) {
  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    const params = new URLSearchParams();
    if (preserveQuery) {
      for (const [k, v] of Object.entries(preserveQuery)) {
        if (v != null && String(v).length > 0) params.set(k, String(v));
      }
    }
    const qs = params.toString();
    const url = `/dashboard/exams/${encodeURIComponent(newId)}/marks${qs ? `?${qs}` : ""}`;
    window.location.assign(url);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-neutral-600">Exam:</label>
      <select
        className="rounded-md border px-3 py-1.5 bg-transparent"
        value={currentExamId}
        onChange={onChange}
      >
        {exams.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name} {e.term ? `— ${e.term}` : ""} {e.year ? `(${e.year})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
