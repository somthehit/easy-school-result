"use client";

import { useMemo, useRef, useState } from "react";

type Subject = { id: string; name: string };
export type SubjectPartRow = { id: string; subjectId: string; name: string; sortOrder: number };
export type ExamPartSetting = {
  subjectPartId: string;
  fullMark: number;
  passMark: number;
  hasConversion?: boolean;
  convertToMark?: number | null;
};

export default function ExamSubjectPartSettingsClient({
  examId,
  subjects,
  parts,
  settings,
}: {
  examId: string;
  subjects: Subject[];
  parts: SubjectPartRow[];
  settings: ExamPartSetting[];
}) {
  const settingMap = useMemo(() => new Map(settings.map((s) => [s.subjectPartId, s])), [settings]);

  const grouped = useMemo(() => {
    const bySubj = new Map<string, SubjectPartRow[]>();
    for (const p of parts) {
      const arr = bySubj.get(p.subjectId) ?? [];
      arr.push(p);
      bySubj.set(p.subjectId, arr);
    }
    for (const [k, arr] of bySubj) arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return bySubj;
  }, [parts]);

  type Row = {
    subjectPartId: string;
    subjectId: string;
    subjectName: string;
    partName: string;
    fullMark: number | "";
    passMark: number | "";
    hasConversion: boolean;
    convertToMark: number | null | "";
  };

  const initialRows: Row[] = useMemo(() => {
    const subjName = new Map(subjects.map((s) => [s.id, s.name]));
    const arr: Row[] = [];
    for (const p of parts) {
      const s = settingMap.get(p.id);
      arr.push({
        subjectPartId: p.id,
        subjectId: p.subjectId,
        subjectName: subjName.get(p.subjectId) || "",
        partName: p.name,
        fullMark: s ? Number(s.fullMark) : ("" as any),
        passMark: s ? Number(s.passMark) : ("" as any),
        hasConversion: Boolean(s?.hasConversion ?? false),
        convertToMark: s && s.convertToMark != null ? Number(s.convertToMark) : ("" as any),
      });
    }
    return arr;
  }, [parts, subjects, settingMap]);

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [filter, setFilter] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const timer = useRef<number | null>(null);
  function showToast(type: "success" | "error", msg: string) {
    if (timer.current) window.clearTimeout(timer.current);
    setToast({ type, msg });
    timer.current = window.setTimeout(() => setToast(null), 2000);
  }

  async function saveOne(idx: number) {
    const r = rows[idx];
    try {
      const payload = {
        examId,
        items: [
          {
            subjectPartId: r.subjectPartId,
            fullMark: r.fullMark === "" ? 0 : Number(r.fullMark),
            passMark: r.passMark === "" ? 0 : Number(r.passMark),
            hasConversion: Boolean(r.hasConversion),
            convertToMark: r.convertToMark === "" ? null : Number(r.convertToMark),
          },
        ],
      };
      const res = await fetch("/api/exam-subject-part-settings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      showToast("success", "Saved");
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    }
  }

  function resetRow(idx: number) {
    setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, fullMark: "" as any, passMark: "" as any, hasConversion: false, convertToMark: null } : x)));
  }

  async function saveAll() {
    try {
      const items = rows.map((r) => ({
        subjectPartId: r.subjectPartId,
        fullMark: r.fullMark === "" ? 0 : Number(r.fullMark),
        passMark: r.passMark === "" ? 0 : Number(r.passMark),
        hasConversion: Boolean(r.hasConversion),
        convertToMark: r.convertToMark === "" ? null : Number(r.convertToMark),
      }));
      const res = await fetch("/api/exam-subject-part-settings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      showToast("success", "All changes saved");
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by subject..."
          className="w-full sm:max-w-xs px-3 py-1.5 border rounded-md bg-transparent"
        />
        <div className="sm:ml-auto text-right">
          <button onClick={saveAll} className="px-3 py-1.5 rounded-md border text-[#6A0DAD] border-[#6A0DAD] hover:bg-[#6A0DAD] hover:text-white">Save All</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Subject</th>
              <th className="py-2 pr-4">Part</th>
              <th className="py-2 pr-4">Exam Full</th>
              <th className="py-2 pr-4">Exam Pass</th>
              <th className="py-2 pr-4">Has Conversion</th>
              <th className="py-2 pr-4">Convert To</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .map((r, idx) => ({ r, idx }))
              .filter(({ r }) => r.subjectName.toLowerCase().includes(filter.toLowerCase()))
              .map(({ r, idx }) => {
                const invalid = (r.fullMark !== "" && r.passMark !== "") && Number(r.passMark) > Number(r.fullMark);
                return (
              <tr key={r.subjectPartId} className="border-b">
                <td className="py-2 pr-4">{r.subjectName}</td>
                <td className="py-2 pr-4">{r.partName}</td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    min={0}
                    value={r.fullMark}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : Number(e.target.value);
                      setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, fullMark: v } : x)));
                    }}
                    className={`w-20 px-2 py-1 border rounded-md bg-transparent ${invalid ? "border-red-400" : ""}`}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    min={0}
                    value={r.passMark}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : Number(e.target.value);
                      setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, passMark: v } : x)));
                    }}
                    className={`w-20 px-2 py-1 border rounded-md bg-transparent ${invalid ? "border-red-400" : ""}`}
                  />
                </td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, hasConversion: !Boolean(x.hasConversion) } : x)))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${r.hasConversion ? 'bg-cyan-500' : 'bg-gray-300'}`}
                    aria-pressed={Boolean(r.hasConversion)}
                    aria-label="Toggle conversion"
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${r.hasConversion ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    min={0}
                    value={r.convertToMark === null ? "" : r.convertToMark}
                    placeholder="e.g. 100"
                    onChange={(e) => {
                      const raw = e.target.value;
                      setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, convertToMark: raw === "" ? null : Number(raw) } : x)));
                    }}
                    disabled={!r.hasConversion}
                    className={`w-24 px-2 py-1 border rounded-md bg-transparent ${!r.hasConversion ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </td>
                <td className="py-2 pr-4 space-x-2">
                  <button onClick={() => saveOne(idx)} className="px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900">Save</button>
                  <button onClick={() => resetRow(idx)} className="px-3 py-1.5 rounded-md border border-yellow-400 text-yellow-700 hover:bg-yellow-50">Reset</button>
                </td>
              </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-3 py-2 rounded-md shadow text-sm ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>{toast.msg}</div>
      )}
    </div>
  );
}
