"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PART_TYPES, type PartType } from "@/lib/marks-calculator";

type SubjectPart = {
  id: string;
  name: string;
  partType: string;
  rawFullMark: number;
  convertedFullMark: number;
  passMark: number;
  sortOrder: number;
  isActive: boolean;
};

type Subject = {
  id: string;
  name: string;
  code?: string;
  defaultFullMark: number;
  creditHours: number;
  parts: SubjectPart[];
};

type Setting = {
  subjectId: string;
  fullMark: number;
  passMark: number;
  hasConversion?: boolean;
  convertToMark?: number | null;
};

type PartSetting = {
  id?: string;
  subjectPartId: string;
  fullMark: number;
  passMark: number;
  hasConversion: boolean;
  convertToMark?: number | null;
};

export default function ExamSubjectSettingsClient({
  examId,
  subjects,
  settings,
  partSettings = [],
}: {
  examId: string;
  subjects: Subject[];
  settings: Setting[];
  partSettings?: PartSetting[];
}) {
  const settingsMap = useMemo(() => new Map(settings.map((s) => [s.subjectId, s])), [settings]);
  const partSettingsMap = useMemo(() => new Map(partSettings.map((ps) => [ps.subjectPartId, ps])), [partSettings]);
  
  const [subjectRows, setSubjectRows] = useState(() => {
    return subjects.map((s) => {
      const existing = settings.find((st) => st.subjectId === s.id);
      return {
        subjectId: s.id,
        subjectName: s.name,
        defaultFull: 0, // Set default to 0
        defaultPass: 0, // Set default to 0
        fullMark: existing?.fullMark ?? 0, // Default to 0 instead of s.defaultFullMark
        passMark: existing?.passMark ?? 0, // Default to 0 instead of calculated value
        hasConversion: existing?.hasConversion ?? false,
        convertToMark: existing?.convertToMark ?? null,
        parts: s.parts || [],
      };
    });
  });

  const [partRows, setPartRows] = useState(() => {
    const allParts: any[] = [];
    subjects.forEach(subject => {
      // Create default TH and PR parts for every subject if they don't exist
      const existingParts = subject.parts || [];
      const hasTH = existingParts.some((p: any) => p.partType === 'TH');
      const hasPR = existingParts.some((p: any) => p.partType === 'PR');
      
      // Add existing parts
      existingParts.forEach((part: any) => {
        const ps = partSettingsMap.get(part.id);
        allParts.push({
          id: part.id,
          subjectId: subject.id,
          subjectName: subject.name,
          partName: part.name,
          partType: part.partType,
          rawFullMark: ps ? ps.fullMark : 0, // Default to 0
          convertedFullMark: part.convertedFullMark,
          passMark: ps ? ps.passMark : 0, // Default to 0
          hasConversion: ps ? ps.hasConversion : false,
          convertToMark: ps?.convertToMark || null,
          sortOrder: part.sortOrder || 0,
          isActive: part.isActive !== false,
        });
      });
      
      // Add default TH part if missing
      if (!hasTH) {
        allParts.push({
          id: `${subject.id}-th-default`,
          subjectId: subject.id,
          subjectName: subject.name,
          partName: 'Theory',
          partType: 'TH',
          rawFullMark: 0,
          convertedFullMark: 0,
          passMark: 0,
          hasConversion: false,
          convertToMark: null,
          sortOrder: 1,
          isActive: true,
        });
      }
      
      // Add default PR part if missing
      if (!hasPR) {
        allParts.push({
          id: `${subject.id}-pr-default`,
          subjectId: subject.id,
          subjectName: subject.name,
          partName: 'Practical',
          partType: 'PR',
          rawFullMark: 0,
          convertedFullMark: 0,
          passMark: 0,
          hasConversion: false,
          convertToMark: null,
          sortOrder: 2,
          isActive: true,
        });
      }
    });
    return allParts.sort((a, b) => a.subjectName.localeCompare(b.subjectName) || a.sortOrder - b.sortOrder);
  });

  // Function to automatically calculate PR marks when TH is set and update subject settings
  function updatePartMarks(subjectId: string, partType: string, newMark: number) {
    // Update part rows with TH/PR balancing
    setPartRows(prev => {
      const updatedParts = prev.map(part => {
        if (part.subjectId !== subjectId) return part;
        
        if (part.partType === partType) {
          // Update the current part
          return { ...part, rawFullMark: newMark };
        } else if (partType === 'TH' && part.partType === 'PR') {
          // Auto-calculate PR when TH is set (only if PR is currently 0)
          if (part.rawFullMark === 0) {
            return { ...part, rawFullMark: Math.max(0, newMark) };
          }
          return part;
        } else if (partType === 'PR' && part.partType === 'TH') {
          // Auto-calculate TH when PR is set (only if TH is currently 0)
          if (part.rawFullMark === 0) {
            return { ...part, rawFullMark: Math.max(0, newMark) };
          }
          return part;
        }
        
        return part;
      });

      // Calculate totals and update subject
      const subjectParts = updatedParts.filter(p => p.subjectId === subjectId);
      const totalFullMark = subjectParts.reduce((sum, part) => sum + (part.rawFullMark || 0), 0);
      const totalPassMark = subjectParts.reduce((sum, part) => sum + (part.passMark || 0), 0);
      const hasAnyConversion = subjectParts.some(part => part.hasConversion);

      // Update subject settings immediately
      setSubjectRows(prevSubjects => prevSubjects.map(subject => 
        subject.subjectId === subjectId 
          ? { 
              ...subject, 
              fullMark: totalFullMark,
              passMark: totalPassMark,
              hasConversion: hasAnyConversion
            }
          : subject
      ));

      return updatedParts;
    });
  }

  // Function to update part pass marks and sync with subject
  function updatePartPassMark(subjectId: string, partId: string, newPassMark: number) {
    setPartRows(prev => {
      const updatedParts = prev.map(part => 
        part.id === partId ? { ...part, passMark: newPassMark } : part
      );

      // Calculate total pass mark and update subject immediately
      const subjectParts = updatedParts.filter(p => p.subjectId === subjectId);
      const totalPassMark = subjectParts.reduce((sum, part) => sum + (part.passMark || 0), 0);

      setSubjectRows(prevSubjects => prevSubjects.map(subject => 
        subject.subjectId === subjectId 
          ? { ...subject, passMark: totalPassMark }
          : subject
      ));

      return updatedParts;
    });
  }

  // Function to update part conversion and sync with subject
  function updatePartConversion(subjectId: string, partId: string, hasConversion: boolean, convertToMark?: number) {
    setPartRows(prev => {
      const updatedParts = prev.map(part => 
        part.id === partId 
          ? { ...part, hasConversion, convertToMark: hasConversion ? convertToMark : null }
          : part
      );

      // Update subject conversion status immediately
      const subjectParts = updatedParts.filter(p => p.subjectId === subjectId);
      const hasAnyConversion = subjectParts.some(part => part.hasConversion);

      setSubjectRows(prevSubjects => prevSubjects.map(subject => 
        subject.subjectId === subjectId 
          ? { ...subject, hasConversion: hasAnyConversion }
          : subject
      ));

      return updatedParts;
    });
  }

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const toastTimer = useRef<number | null>(null);
  
  function showToast(type: "success" | "error", msg: string) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  }

  function resetSubjectRow(idx: number) {
    setSubjectRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              fullMark: r.defaultFull,
              passMark: r.defaultPass,
              hasConversion: false,
              convertToMark: null,
            }
          : r
      )
    );
  }

  function resetPartRow(idx: number) {
    setPartRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              rawFullMark: 0,
              passMark: 0,
              hasConversion: false,
              convertToMark: null,
            }
          : r
      )
    );
  }

  async function saveSubjectOne(idx: number) {
    const r = subjectRows[idx];
    try {
      const res = await fetch("/api/exam-subject-settings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, items: [
          {
            subjectId: r.subjectId,
            fullMark: Number(r.fullMark || 0),
            passMark: Number(r.passMark || 0),
            hasConversion: Boolean(r.hasConversion),
            convertToMark: r.convertToMark == null ? null : Number(r.convertToMark),
          },
        ] }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      showToast("success", "Saved");
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    }
  }

  async function saveAllSubjects() {
    try {
      const items = subjectRows.map((r) => ({
        subjectId: r.subjectId,
        fullMark: Number(r.fullMark || 0),
        passMark: Number(r.passMark || 0),
        hasConversion: Boolean(r.hasConversion),
        convertToMark: r.convertToMark == null ? null : Number(r.convertToMark),
      }));
      const res = await fetch("/api/exam-subject-settings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, items }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      showToast("success", "All changes saved");
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    }
  }


  async function savePartOne(idx: number) {
    const part = partRows[idx];
    try {
      const res = await fetch("/api/exam-subject-part-settings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, items: [
          {
            subjectId: part.subjectId,
            partType: part.partType,
            fullMark: Number(part.rawFullMark || 0),
            passMark: Number(part.passMark || 0),
            hasConversion: Boolean(part.hasConversion),
            convertToMark: part.convertToMark,
          }
        ] }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      showToast("success", "Part settings saved");
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    }
  }

  async function saveAllParts() {
    try {
      const items = partRows.map((part) => ({
        subjectId: part.subjectId,
        partType: part.partType,
        fullMark: Number(part.rawFullMark || 0),
        passMark: Number(part.passMark || 0),
        hasConversion: Boolean(part.hasConversion),
        convertToMark: part.convertToMark,
      }));
      const res = await fetch("/api/exam-subject-part-settings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, items }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      showToast("success", "All part settings saved");
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    }
  }

  // Allow page header button to trigger saveAll via custom event
  useEffect(() => {
    const handler = () => {
      void saveAllSubjects();
    };
    window.addEventListener("saveAllSubjectSettings", handler as any);
    return () => window.removeEventListener("saveAllSubjectSettings", handler as any);
  }, [subjectRows]);

  return (
    <div className="space-y-8">
      {/* Subject Settings Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Subject Settings — First Terms</h2>
          <button 
            onClick={saveAllSubjects}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
          >
            Save All
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Default Full</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Default Pass</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Exam Full</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Exam Pass</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Has Conversion</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Convert To</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subjectRows.map((r, idx) => {
                const invalid = Number(r.passMark || 0) > Number(r.fullMark || 0);
                return (
                  <tr key={r.subjectId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.subjectName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.defaultFull}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.defaultPass}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min={0}
                        value={r.fullMark}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setSubjectRows((prev) => prev.map((x, i) => (i === idx ? { ...x, fullMark: v } : x)));
                        }}
                        className={`w-20 px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none ${
                          invalid ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min={0}
                        value={r.passMark}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setSubjectRows((prev) => prev.map((x, i) => (i === idx ? { ...x, passMark: v } : x)));
                        }}
                        className={`w-20 px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none ${
                          invalid ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setSubjectRows((prev) => prev.map((x, i) => (i === idx ? { ...x, hasConversion: !Boolean(x.hasConversion) } : x)))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${r.hasConversion ? 'bg-cyan-500' : 'bg-gray-300'}`}
                        aria-pressed={Boolean(r.hasConversion)}
                        aria-label="Toggle conversion"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${r.hasConversion ? 'translate-x-4' : 'translate-x-1'}`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min={0}
                        value={r.convertToMark ?? ""}
                        placeholder="e.g. 100"
                        onChange={(e) => {
                          const raw = e.target.value;
                          setSubjectRows((prev) => prev.map((x, i) => (i === idx ? { ...x, convertToMark: raw === "" ? null : Number(raw) } : x)));
                        }}
                        disabled={!r.hasConversion}
                        className={`w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none ${
                          !r.hasConversion ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => saveSubjectOne(idx)}
                          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => resetSubjectRow(idx)}
                          className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-part Settings Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Per-part Settings ({partRows.length} parts)</h2>
              <p className="text-purple-100 text-sm">Auto-calculates PR when TH is set (and vice versa)</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Part</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Exam Full</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Exam Pass</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Has Conversion</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Convert To</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {partRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 mb-1">No Subject Parts Found</p>
                        <p className="text-sm text-gray-500 mb-2">
                          Debug: {subjects.length} subjects found
                        </p>
                        <p className="text-xs text-gray-400">
                          {subjects.length > 0 ? `Subjects: ${subjects.map(s => s.name).join(', ')}` : 'No subjects loaded'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                partRows.map((part, idx) => {
                const invalid = Number(part.passMark || 0) > Number(part.rawFullMark || 0);
                return (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{part.subjectName}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          part.partType === 'TH' ? 'bg-blue-100 text-blue-800' :
                          part.partType === 'PR' ? 'bg-green-100 text-green-800' :
                          part.partType === 'VI' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {part.partType}
                        </span>
                        <span className="text-sm text-gray-700">{part.partName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min={0}
                        value={part.rawFullMark}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updatePartMarks(part.subjectId, part.partType, v);
                        }}
                        className={`w-20 px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none ${
                          invalid ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min={0}
                        value={part.passMark}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updatePartPassMark(part.subjectId, part.id, v);
                        }}
                        className={`w-20 px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none ${
                          invalid ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => updatePartConversion(part.subjectId, part.id, !Boolean(part.hasConversion), part.convertToMark || undefined)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${part.hasConversion ? 'bg-cyan-500' : 'bg-gray-300'}`}
                        aria-pressed={Boolean(part.hasConversion)}
                        aria-label="Toggle conversion"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${part.hasConversion ? 'translate-x-4' : 'translate-x-1'}`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min={0}
                        value={part.convertToMark ?? ""}
                        placeholder="e.g. 100"
                        onChange={(e) => {
                          const raw = e.target.value;
                          const convertToMark = raw === "" ? null : Number(raw);
                          updatePartConversion(part.subjectId, part.id, part.hasConversion, convertToMark || undefined);
                        }}
                        disabled={!part.hasConversion}
                        className={`w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none ${
                          !part.hasConversion ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => savePartOne(idx)}
                          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => resetPartRow(idx)}
                          className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 text-sm text-gray-500 border-t border-gray-200">
          If a setting is saved for a subject here, it overrides the class default marks for this exam.
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}