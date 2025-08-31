"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Student = { id: string; name: string; rollNo: number };
export type Subject = { id: string; name: string };
export type SubjectPart = { id: string; name: string; sortOrder: number; fullMark: number | null; passMark: number | null; hasConversion: boolean; convertToMark: number | null };

export default function ExamMarksEntryByStudentClient({
  examId,
  subjects,
  students,
  partsBySubject,
  selectedStudentId,
  initialMarks, // marks for selected student across all subjects
}: {
  examId: string;
  subjects: Subject[];
  students: Student[];
  partsBySubject: Record<string, SubjectPart[]>;
  selectedStudentId: string;
  initialMarks: Array<{ subjectId: string; subjectPartId: string | null; obtained: number; converted: number }>; // for selected student
}) {
  const [studentId, setStudentId] = useState(selectedStudentId);

  // Map marks per subject/part for the selected student
  const initBySubject = useMemo(() => {
    const m = new Map<string, Array<{ subjectPartId: string | null; obtained: number; converted: number }>>();
    for (const row of initialMarks) {
      const arr = m.get(row.subjectId) ?? [];
      arr.push({ subjectPartId: row.subjectPartId ?? null, obtained: Number(row.obtained), converted: Number(row.converted) });
      m.set(row.subjectId, arr);
    }
    return m;
  }, [initialMarks]);

  type PartMarks = { obtained: number | ""; converted: number | "" };
  type RowState = {
    subjectId: string;
    subjectName: string;
    partMarks: Record<string, PartMarks>; // key: subjectPartId
    obtained: number | "";
    converted: number | "";
  };

  const [rows, setRows] = useState<RowState[]>(() => {
    return subjects.map((s) => {
      const parts = partsBySubject[s.id] || [];
      const entries = initBySubject.get(s.id) || [];
      const partMarks: Record<string, PartMarks> = {};
      if (parts.length) {
        for (const p of parts) {
          const found = entries.find((e) => e.subjectPartId === p.id);
          partMarks[p.id] = found ? { obtained: Number(found.obtained), converted: Number(found.converted) } : { obtained: "", converted: "" };
        }
      }
      const legacy = entries.find((e) => e.subjectPartId == null);
      return {
        subjectId: s.id,
        subjectName: s.name,
        partMarks,
        obtained: legacy ? Number(legacy.obtained) : ("" as any),
        converted: legacy ? Number(legacy.converted) : ("" as any),
      };
    });
  });

  // Save success list for current student
  const [savedSubjectIds, setSavedSubjectIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const timer = useRef<number | null>(null);
  function showToast(type: "success" | "error", msg: string) {
    if (timer.current) window.clearTimeout(timer.current);
    setToast({ type, msg });
    timer.current = window.setTimeout(() => setToast(null), 2000);
  }

  // When student changes, navigate and reset
  useEffect(() => {
    if (studentId !== selectedStudentId) {
      const u = new URL(window.location.href);
      u.searchParams.set("view", "student");
      u.searchParams.set("studentId", studentId);
      window.location.assign(u.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Reset saved list when URL student changes (handled server-side on reload) - defensive reset on mount
  useEffect(() => {
    setSavedSubjectIds(new Set());
  }, [selectedStudentId]);

  function computeConverted(obtained: number | "", opts?: { fullMark?: number | null; hasConversion?: boolean; convertToMark?: number | null }): number | "" {
    if (obtained === "") return "";
    const baseFull = opts?.fullMark ?? null;
    const baseHasConv = opts?.hasConversion ?? false;
    const baseConvTo = opts?.convertToMark ?? null;
    if (!baseHasConv || !baseConvTo || !baseFull) return obtained;
    const c = (Number(obtained) / Number(baseFull)) * Number(baseConvTo);
    return Number.isFinite(c) ? Math.round(c * 100) / 100 : obtained;
  }

  function isValueInvalid(v: number | "", max?: number | null) {
    if (v === "") return false;
    if (typeof v !== "number" || Number.isNaN(v)) return true;
    if (v < 0) return true;
    if (max != null && Number.isFinite(max) && v > Number(max)) return true;
    return false;
  }

  async function saveOneSubject(subjectId: string) {
    try {
      const subjParts = partsBySubject[subjectId] || [];
      const rIdx = rows.findIndex((r) => r.subjectId === subjectId);
      if (rIdx < 0) return;
      let payload: any = null;
      if (subjParts.length === 0) {
        if (rows[rIdx].obtained === "") return;
        payload = {
          examId,
          subjectId,
          items: [
            {
              studentId,
              subjectPartId: null,
              obtained: Number(rows[rIdx].obtained),
              converted: rows[rIdx].converted === "" ? null : Number(rows[rIdx].converted),
            },
          ],
        };
      } else {
        const items = Object.entries(rows[rIdx].partMarks)
          .filter(([, v]) => v.obtained !== "")
          .map(([pid, v]) => ({
            studentId,
            subjectPartId: pid,
            obtained: Number(v.obtained as number),
            converted: v.converted === "" ? null : Number(v.converted as number),
          }));
        if (items.length === 0) return;
        payload = { examId, subjectId, items };
      }
      const res = await fetch("/api/marks/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSavedSubjectIds((prev) => new Set(prev).add(subjectId));
      showToast("success", "Saved");
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    }
  }

  async function saveAll() {
    try {
      const items: Array<any> = [];
      for (const r of rows) {
        const parts = partsBySubject[r.subjectId] || [];
        if (parts.length === 0) {
          if (r.obtained === "") continue;
          items.push({ studentId, subjectPartId: null, obtained: Number(r.obtained), converted: r.converted === "" ? null : Number(r.converted), subjectId: r.subjectId });
        } else {
          for (const pid of Object.keys(r.partMarks)) {
            const v = r.partMarks[pid];
            if (v.obtained === "") continue;
            items.push({ studentId, subjectPartId: pid, obtained: Number(v.obtained as number), converted: v.converted === "" ? null : Number(v.converted as number), subjectId: r.subjectId });
          }
        }
      }
      if (!items.length) return;
      // Group by subject for API calls
      const bySub: Record<string, Array<any>> = {};
      for (const it of items) {
        (bySub[it.subjectId] ||= []).push({ studentId: it.studentId, subjectPartId: it.subjectPartId, obtained: it.obtained, converted: it.converted });
      }
      const results = await Promise.all(
        Object.entries(bySub).map(async ([sid, arr]) => {
          const res = await fetch("/api/marks/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examId, subjectId: sid, items: arr }) });
          const data = await res.json();
          return { ok: res.ok, sid, data };
        })
      );
      const anyFail = results.some((r) => !r.ok);
      const saved = results.filter((r) => r.ok).map((r) => r.sid);
      setSavedSubjectIds((prev) => new Set([...(prev as any), ...saved]));
      showToast(anyFail ? "error" : "success", anyFail ? "Some failed" : "All changes saved");
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    }
  }

  const hasAnyInvalid = useMemo(() => {
    return rows.some((r) => {
      const parts = partsBySubject[r.subjectId] || [];
      if (parts.length === 0) return isValueInvalid(r.obtained, (parts[0] as any)?.fullMark || undefined);
      return Object.entries(r.partMarks).some(([pid, v]) => {
        const p = (parts as SubjectPart[]).find((pp) => pp.id === pid);
        return isValueInvalid(v.obtained, p?.fullMark ?? null);
      });
    });
  }, [rows, partsBySubject]);

  return (
    <div className="space-y-6">
      {/* Student Selector */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <label className="text-sm font-medium text-gray-700">Select Student:</label>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
            value={studentId} 
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                Roll {s.rollNo} - {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Marks Entry Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Subject</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Marks</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
            {rows.map((r, idx) => {
              const parts = partsBySubject[r.subjectId] || [];
              const isSaved = savedSubjectIds.has(r.subjectId);
              return (
                <tr key={r.subjectId} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{r.subjectName}</div>
                        {isSaved && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Saved
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {parts.length === 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-600">Obtained</label>
                          <input
                            type="number"
                            min={0}
                            onChange={(e) => {
                              const v = e.target.value === "" ? "" : Number(e.target.value);
                              setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, obtained: v, converted: computeConverted(v) } : x)));
                            }}
                            value={r.obtained}
                            className={`w-24 px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              isValueInvalid(r.obtained) ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                            }`}
                            placeholder="0"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-600">Converted</label>
                          <input
                            type="number"
                            min={0}
                            onChange={(e) => {
                              const v = e.target.value === "" ? "" : Number(e.target.value);
                              setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, converted: v } : x)));
                            }}
                            value={r.converted}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-start gap-4">
                        {parts.map((p) => (
                          <div key={p.id} className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{p.name}</span>
                              {p.fullMark && <span className="text-xs text-gray-500">/{p.fullMark}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={p.fullMark ?? undefined}
                                value={r.partMarks[p.id]?.obtained ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value === "" ? "" : Number(e.target.value);
                                  setRows((prev) => prev.map((x, i) => {
                                    if (i !== idx) return x;
                                    const pm = { ...(x.partMarks[p.id] || { obtained: "", converted: "" }) } as PartMarks;
                                    pm.obtained = v;
                                    pm.converted = computeConverted(v, { fullMark: p.fullMark, hasConversion: p.hasConversion, convertToMark: p.convertToMark });
                                    return { ...x, partMarks: { ...x.partMarks, [p.id]: pm } };
                                  }));
                                }}
                                className={`w-20 px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                  isValueInvalid(r.partMarks[p.id]?.obtained ?? "", p.fullMark) ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                                }`}
                                placeholder="0"
                              />
                              {p.hasConversion && p.convertToMark ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={r.partMarks[p.id]?.converted ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value === "" ? "" : Number(e.target.value);
                                    setRows((prev) => prev.map((x, i) => {
                                      if (i !== idx) return x;
                                      const pm = { ...(x.partMarks[p.id] || { obtained: "", converted: "" }) } as PartMarks;
                                      pm.converted = v;
                                      return { ...x, partMarks: { ...x.partMarks, [p.id]: pm } };
                                    }));
                                  }}
                                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  placeholder="0"
                                />
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => saveOneSubject(r.subjectId)} 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      {/* Save All Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {savedSubjectIds.size > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {savedSubjectIds.size} subject{savedSubjectIds.size !== 1 ? 's' : ''} saved
            </span>
          )}
        </div>
        <button
          disabled={hasAnyInvalid}
          title={hasAnyInvalid ? "Fix invalid marks before saving" : undefined}
          onClick={saveAll}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save All Changes
        </button>
      </div>

      {/* Saved subjects summary */}
      {savedSubjectIds.size > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="font-semibold text-sm text-emerald-800 mb-2">Saved Subjects for This Student</h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(savedSubjectIds).map((sid) => (
              <span key={sid} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {subjects.find((s) => s.id === sid)?.name || sid}
              </span>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
            toast.type === "success" 
              ? "bg-emerald-600 text-white" 
              : "bg-red-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
