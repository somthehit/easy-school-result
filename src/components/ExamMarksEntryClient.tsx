"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Student = { id: string; name: string; rollNo: number };
export type Subject = { id: string; name: string };
export type SubjectPart = { id: string; name: string; sortOrder: number; fullMark: number | null; passMark: number | null; hasConversion: boolean; convertToMark: number | null };

export default function ExamMarksEntryClient({
  examId,
  subjectId,
  subjects,
  students,
  parts = [],
  initialMarks,
  gradingBase,
  lockedStudentIds = [],
  focusStudentId,
}: {
  examId: string;
  subjectId: string;
  subjects: Subject[];
  students: Student[];
  parts?: SubjectPart[];
  initialMarks: Array<{ studentId: string; subjectPartId: string | null; obtained: number; converted: number }>;
  gradingBase: { fullMark: number; hasConversion: boolean; convertToMark: number | null };
  lockedStudentIds?: string[];
  focusStudentId?: string;
}) {
  const [selectedSubject, setSelectedSubject] = useState(subjectId);
  // Build per-student per-part map
  const byStudent: Map<string, Array<{ subjectPartId: string | null; obtained: number; converted: number }>> = useMemo(() => {
    const m = new Map<string, Array<{ subjectPartId: string | null; obtained: number; converted: number }>>();
    for (const row of initialMarks) {
      const arr = m.get(row.studentId) ?? [];
      arr.push({ subjectPartId: row.subjectPartId ?? null, obtained: Number(row.obtained), converted: Number(row.converted) });
      m.set(row.studentId, arr);
    }
    return m;
  }, [initialMarks]);
  type PartMarks = { obtained: number | ""; converted: number | "" };
  type RowState = {
    studentId: string;
    name: string;
    rollNo: number;
    // For multi-part subjects
    partMarks: Record<string, PartMarks>; // key: subjectPartId
    // For legacy single-part
    obtained: number | "";
    converted: number | "";
  };
  const [rows, setRows] = useState<RowState[]>(() => {
    const partIds = parts.map((p) => p.id);
    return students.map((s) => {
      const entries = byStudent.get(s.id) || [];
      const partMarks: Record<string, PartMarks> = {};
      if (parts.length) {
        for (const pid of partIds) {
          const found = entries.find((e) => e.subjectPartId === pid);
          partMarks[pid] = found ? { obtained: Number(found.obtained), converted: Number(found.converted) } : { obtained: "", converted: "" };
        }
      }
      const legacy = entries.find((e) => e.subjectPartId == null);
      return {
        studentId: s.id,
        name: s.name,
        rollNo: s.rollNo,
        partMarks,
        obtained: legacy ? Number(legacy.obtained) : ("" as any),
        converted: legacy ? Number(legacy.converted) : ("" as any),
      };
    });
  });
  const lockedSet = useMemo(() => new Set(lockedStudentIds), [lockedStudentIds]);

  // Validation helpers
  function isValueInvalid(v: number | "", max?: number | null) {
    if (v === "") return false;
    if (typeof v !== "number" || Number.isNaN(v)) return true;
    if (v < 0) return true;
    if (max != null && Number.isFinite(max) && v > Number(max)) return true;
    return false;
  }
  const hasAnyInvalid = useMemo(() => {
    if (parts.length === 0) {
      return rows.some((r) => isValueInvalid(r.obtained, gradingBase.fullMark || undefined));
    }
    return rows.some((r) =>
      Object.entries(r.partMarks).some(([pid, v]) =>
        isValueInvalid(v.obtained, parts.find((p) => p.id === pid)?.fullMark ?? null)
      )
    );
  }, [rows, parts, gradingBase.fullMark]);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const timer = useRef<number | null>(null);
  function showToast(type: "success" | "error", msg: string) {
    if (timer.current) window.clearTimeout(timer.current);
    setToast({ type, msg });
    timer.current = window.setTimeout(() => setToast(null), 2000);
  }

  // Navigate when subject changes
  useEffect(() => {
    if (selectedSubject !== subjectId) {
      const u = new URL(window.location.href);
      u.searchParams.set("subjectId", selectedSubject);
      window.location.assign(u.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject]);

  // Auto-focus and highlight a specific student's row if provided
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusStudentId) return;
    // Wait for DOM paint
    const id = `row-stu-${focusStudentId}`;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector<HTMLInputElement>("input[type='number']");
      if (input && !input.disabled) {
        input.focus();
        // Move caret to end
        const v = input.value;
        input.value = "";
        input.value = v;
      }
      setHighlightId(focusStudentId);
      const t = window.setTimeout(() => setHighlightId(null), 2500);
      return () => window.clearTimeout(t);
    }
  }, [focusStudentId]);

  function computeConverted(obtained: number | "", opts?: { fullMark?: number | null; hasConversion?: boolean; convertToMark?: number | null }): number | "" {
    if (obtained === "") return "";
    const baseFull = opts?.fullMark ?? gradingBase.fullMark;
    const baseHasConv = opts?.hasConversion ?? gradingBase.hasConversion;
    const baseConvTo = opts?.convertToMark ?? gradingBase.convertToMark;
    if (!baseHasConv || !baseConvTo || !baseFull) return obtained;
    const c = (Number(obtained) / Number(baseFull)) * Number(baseConvTo);
    return Number.isFinite(c) ? Math.round(c * 100) / 100 : obtained;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">Subject:</label>
        <select
          className="rounded-md border px-3 py-1.5 bg-transparent"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="ml-auto text-xs text-neutral-600">
          Full: {gradingBase.fullMark} {gradingBase.hasConversion && gradingBase.convertToMark ? `→ Converted to ${gradingBase.convertToMark}` : ""}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Roll</th>
              <th className="py-2 pr-4">Student</th>
              {parts.length === 0 ? (
                <>
                  <th className="py-2 pr-4">Obtained</th>
                  {gradingBase.hasConversion && gradingBase.convertToMark ? (
                    <th className="py-2 pr-4">Converted</th>
                  ) : null}
                </>
              ) : (
                parts.map((p) => (
                  <th key={p.id} className="py-2 pr-4">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[10px] text-neutral-500">
                      {p.fullMark ? `Full ${p.fullMark}` : ""} {p.hasConversion && p.convertToMark ? `→ ${p.convertToMark}` : ""}
                    </div>
                  </th>
                ))
              )}
              <th className="py-2 pr-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr id={`row-stu-${r.studentId}`} key={r.studentId} className={`border-b ${highlightId === r.studentId ? "ring-2 ring-[#6A0DAD]" : ""}`}>
                <td className="py-2 pr-4">{r.rollNo}</td>
                <td className="py-2 pr-4">
                  <span>{r.name}</span>
                  {lockedSet.has(r.studentId) && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 align-middle">Locked</span>
                  )}
                </td>
                {parts.length === 0 ? (
                  <>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min={0}
                        max={gradingBase.fullMark || undefined}
                        value={r.obtained}
                        disabled={lockedSet.has(r.studentId)}
                        onChange={(e) => {
                          const v = e.target.value === "" ? "" : Number(e.target.value);
                          setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, obtained: v, converted: computeConverted(v) } : x)));
                        }}
                        className={`w-24 px-2 py-1 border rounded-md bg-transparent ${isValueInvalid(r.obtained, gradingBase.fullMark || undefined) ? "border-red-500" : ""}`}
                      />
                      {gradingBase.fullMark ? (
                        <div className="text-[10px] text-neutral-500 mt-1">Full {gradingBase.fullMark}</div>
                      ) : null}
                    </td>
                    {gradingBase.hasConversion && gradingBase.convertToMark ? (
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          value={r.converted}
                          disabled={lockedSet.has(r.studentId)}
                          onChange={(e) => {
                            const v = e.target.value === "" ? "" : Number(e.target.value);
                            setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, converted: v } : x)));
                          }}
                          className="w-24 px-2 py-1 border rounded-md bg-transparent"
                        />
                      </td>
                    ) : null}
                  </>
                ) : (
                  parts.map((p) => (
                    <td key={p.id} className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={p.fullMark ?? undefined}
                          value={r.partMarks[p.id]?.obtained ?? ""}
                          disabled={lockedSet.has(r.studentId)}
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
                          className={`w-24 px-2 py-1 border rounded-md bg-transparent ${isValueInvalid(r.partMarks[p.id]?.obtained ?? "", p.fullMark) ? "border-red-500" : ""}`}
                        />
                        {p.hasConversion && p.convertToMark ? (
                          <input
                            type="number"
                            min={0}
                            value={r.partMarks[p.id]?.converted ?? ""}
                            disabled={lockedSet.has(r.studentId)}
                            onChange={(e) => {
                              const v = e.target.value === "" ? "" : Number(e.target.value);
                              setRows((prev) => prev.map((x, i) => {
                                if (i !== idx) return x;
                                const pm = { ...(x.partMarks[p.id] || { obtained: "", converted: "" }) } as PartMarks;
                                pm.converted = v;
                                return { ...x, partMarks: { ...x.partMarks, [p.id]: pm } };
                              }));
                            }}
                            className="w-24 px-2 py-1 border rounded-md bg-transparent"
                          />
                        ) : null}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1">
                        {p.fullMark ? `Full ${p.fullMark}` : ""} {p.passMark ? `· Pass ${p.passMark}` : ""}
                      </div>
                    </td>
                  ))
                )}
                <td className="py-2 pr-4">
                  <button
                    disabled={lockedSet.has(r.studentId) || hasAnyInvalid}
                    title={hasAnyInvalid ? "Fix invalid marks before saving" : undefined}
                    onClick={async () => {
                      try {
                        if (hasAnyInvalid) {
                          showToast("error", "Fix invalid marks before saving");
                          return;
                        }
                        let payload: any = null;
                        if (parts.length === 0) {
                          if (rows[idx].obtained === "") return;
                          payload = {
                            examId,
                            subjectId: selectedSubject,
                            items: [
                              {
                                studentId: r.studentId,
                                subjectPartId: null,
                                obtained: Number(rows[idx].obtained),
                                converted: rows[idx].converted === "" ? null : Number(rows[idx].converted),
                              },
                            ],
                          };
                        } else {
                          const items = Object.entries(rows[idx].partMarks)
                            .filter(([, v]) => v.obtained !== "")
                            .map(([pid, v]) => ({
                              studentId: r.studentId,
                              subjectPartId: pid,
                              obtained: Number(v.obtained as number),
                              converted: v.converted === "" ? null : Number(v.converted as number),
                            }));
                          if (items.length === 0) return;
                          payload = { examId, subjectId: selectedSubject, items };
                        }
                        const res = await fetch("/api/marks/bulk", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Save failed");
                        if (Array.isArray(data.skipped) && data.skipped.includes(r.studentId)) {
                          showToast("error", "Locked (published). Not saved.");
                        } else {
                          showToast("success", "Saved");
                        }
                      } catch (e: any) {
                        showToast("error", e?.message || "Save failed");
                      }
                    }}
                    className="px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right">
        <button
          disabled={hasAnyInvalid}
          title={hasAnyInvalid ? "Fix invalid marks before saving" : undefined}
          onClick={async () => {
            try {
              if (hasAnyInvalid) {
                showToast("error", "Fix invalid marks before saving");
                return;
              }
              let items: Array<any> = [];
              if (parts.length === 0) {
                items = rows
                  .filter((r) => r.obtained !== "")
                  .map((r) => ({
                    studentId: r.studentId,
                    subjectPartId: null,
                    obtained: Number(r.obtained),
                    converted: r.converted === "" ? null : Number(r.converted),
                  }));
              } else {
                for (const r of rows) {
                  for (const pid of Object.keys(r.partMarks)) {
                    const v = r.partMarks[pid];
                    if (v.obtained === "") continue;
                    items.push({
                      studentId: r.studentId,
                      subjectPartId: pid,
                      obtained: Number(v.obtained as number),
                      converted: v.converted === "" ? null : Number(v.converted as number),
                    });
                  }
                }
              }
              const res = await fetch("/api/marks/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId, subjectId: selectedSubject, items }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Save failed");
              if (Array.isArray(data.skipped) && data.skipped.length) {
                showToast("error", `${data.skipped.length} locked. Others saved.`);
              } else {
                showToast("success", "All changes saved");
              }
            } catch (e: any) {
              showToast("error", e?.message || "Save failed");
            }
          }}
          className="px-3 py-1.5 rounded-md border text-[#6A0DAD] border-[#6A0DAD] hover:bg-[#6A0DAD] hover:text-white"
        >
          Save All
        </button>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-3 py-2 rounded-md shadow text-sm ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>{toast.msg}</div>
      )}
    </div>
  );
}
