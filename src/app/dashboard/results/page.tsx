"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";

// Initialize pdfmake fonts for browser usage
// @ts-ignore
const __vfs = (vfsFonts as any)?.pdfMake?.vfs || (vfsFonts as any)?.vfs;
if (__vfs) {
  // @ts-ignore
  (pdfMake as any).vfs = __vfs;
}

export default function ResultsReportsPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<{ exams: any[]; results: any[]; subjects: any[]; parts?: any[]; marks?: any[]; anyConversion?: boolean; classExams?: any[]; allMarks?: any[]; userProfile?: { name?: string | null; principalName?: string | null; schoolName?: string | null; schoolAddress?: string | null; schoolPhone?: string | null; schoolEmail?: string | null }; partSettings?: Array<{ subjectPartId: string; hasConversion: boolean; convertToMark: number | null; fullMark: number }> }>({ exams: [], results: [], subjects: [], parts: [], marks: [], anyConversion: false, classExams: [], allMarks: [], userProfile: { name: null, principalName: null, schoolName: null, schoolAddress: null, schoolPhone: null, schoolEmail: null }, partSettings: [] });
  const [year, setYear] = useState<string>(String(search.get("year") || ""));
  const [classId, setClassId] = useState<string>(String(search.get("classId") || ""));
  const [examId, setExamId] = useState<string>(String(search.get("examId") || ""));
  const [sortBy, setSortBy] = useState<"name" | "rollNo" | "total" | "percentage" | "grade" | "rank">(
    (search.get("sortBy") as any) || "rank"
  );
  const [dir, setDir] = useState<"asc" | "desc">(((search.get("dir") || "asc").toLowerCase() === "desc") ? "desc" : "asc");

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams();
      if (year) params.set("year", year);
      if (classId) params.set("classId", classId);
      if (examId) params.set("examId", examId);
      params.set("sortBy", sortBy);
      params.set("dir", dir);
      try {
        const res = await fetch(`/dashboard/results/query?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        let json: any = null;
        try {
          json = await res.json();
        } catch {
          json = {};
        }
        const safe = {
          exams: Array.isArray(json?.exams) ? json.exams : [],
          results: Array.isArray(json?.results) ? json.results : [],
          subjects: Array.isArray(json?.subjects) ? json.subjects : [],
          parts: Array.isArray(json?.parts) ? json.parts : [],
          marks: Array.isArray(json?.marks) ? json.marks : [],
          anyConversion: Boolean(json?.anyConversion),
          classExams: Array.isArray(json?.classExams) ? json.classExams : [],
          allMarks: Array.isArray(json?.allMarks) ? json.allMarks : [],
          userProfile: (json?.userProfile && typeof json.userProfile === 'object') ? json.userProfile : { name: null, principalName: null, schoolName: null, schoolAddress: null, schoolPhone: null, schoolEmail: null },
          partSettings: Array.isArray(json?.partSettings) ? json.partSettings : [],
        } as any;
        setData(safe);
      } catch (e) {
        // Fallback to empty, valid shape
        setData({ exams: [], results: [], subjects: [], parts: [], marks: [], anyConversion: false, classExams: [], allMarks: [], userProfile: { name: null, principalName: null, schoolName: null, schoolAddress: null, schoolPhone: null, schoolEmail: null }, partSettings: [] });
      }
    };
    load();
  }, [year, classId, examId, sortBy, dir]);

  // Keep URL in sync (optional but helpful for deep links)
  useEffect(() => {
    const u = new URL(window.location.href);
    if (year) u.searchParams.set("year", year); else u.searchParams.delete("year");
    if (classId) u.searchParams.set("classId", classId); else u.searchParams.delete("classId");
    if (examId) u.searchParams.set("examId", examId); else u.searchParams.delete("examId");
    u.searchParams.set("sortBy", sortBy);
    u.searchParams.set("dir", dir);
    window.history.replaceState(null, "", u.toString());
  }, [year, classId, examId, sortBy, dir]);

  const shareUrl = (token?: string | null) => (token ? `${location.origin}/public-result/${token}` : "-");

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("asc");
    }
  };

  function num2(n: number) {
    return Number(n).toFixed(2);
  }

  // Helpers to detect Theory/Practical robustly
  const isTH = (p: any) => {
    const pt = String(p?.partType || "").toUpperCase();
    if (pt === "TH") return true;
    const nm = String(p?.name || "").toUpperCase();
    return nm === "TH" || nm.startsWith("TH") || nm.includes("THEORY");
  };
  const isPR = (p: any) => {
    const pt = String(p?.partType || "").toUpperCase();
    if (pt === "PR") return true;
    const nm = String(p?.name || "").toUpperCase();
    return nm === "PR" || nm.startsWith("PR") || nm.includes("PRACT");
  };

  // Part settings map for Convt In per part
  const partSettingById = useMemo(() => {
    const m = new Map<string, { hasConversion: boolean; convertToMark: number | null; fullMark: number }>();
    (data.partSettings || []).forEach((ps: any) => m.set(ps.subjectPartId, { hasConversion: Boolean(ps.hasConversion), convertToMark: ps.convertToMark != null ? Number(ps.convertToMark) : null, fullMark: Number(ps.fullMark) }));
    return m;
  }, [data.partSettings]);

  // State for PDF theme selection
  const [pdfTheme, setPdfTheme] = useState<'blue' | 'purple' | 'green' | 'red' | 'orange' | 'teal'>('blue');

  // Theme colors helper - darker themes
  const getThemeColors = () => {
    switch (pdfTheme) {
      case 'blue':
        return { accent: '#1E40AF', accentLight: '#bfdbfe', background: '#eff6ff', lightBg: '#dbeafe' };
      case 'purple':
        return { accent: '#6D28D9', accentLight: '#ddd6fe', background: '#f5f3ff', lightBg: '#e9d5ff' };
      case 'green':
        return { accent: '#047857', accentLight: '#bbf7d0', background: '#ecfdf5', lightBg: '#d1fae5' };
      case 'red':
        return { accent: '#B91C1C', accentLight: '#fca5a5', background: '#fef2f2', lightBg: '#fecaca' };
      case 'orange':
        return { accent: '#C2410C', accentLight: '#fdba74', background: '#fff7ed', lightBg: '#fed7aa' };
      case 'teal':
        return { accent: '#0F766E', accentLight: '#99f6e4', background: '#f0fdfa', lightBg: '#ccfbf1' };
      default:
        return { accent: '#1E40AF', accentLight: '#bfdbfe', background: '#eff6ff', lightBg: '#dbeafe' };
    }
  };

  // Build PDF: class-wise table (one row per student) with subject groups TH/PR/Total
  function buildSelectedExamPDFDoc(): any {
    const subjects: any[] = data.subjects || [];
    const parts: any[] = data.parts || [];
    const marks: any[] = data.marks || [];
    const students: any[] = data.results || [];
    const exam = (data.exams || []).find((e: any) => e.id === examId);
    const selectedClass = classesForYear.find(c => c.id === classId);
    const colors = getThemeColors();

    // Parts by subject for quick lookup
    const partsBySubject = new Map<string, any[]>();
    (parts || []).forEach((p: any) => {
      const arr = partsBySubject.get(p.subjectId) || [];
      arr.push(p);
      partsBySubject.set(p.subjectId, arr);
    });

    const sumForConv = (studentId: string, subjectId: string, pred: (mk: any) => boolean) =>
      (marks || []).reduce((acc, mk: any) => (
        mk.studentId === studentId && mk.subjectId === subjectId && pred(mk)
          ? acc + (Number(mk.converted) || 0)
          : acc
      ), 0);

    // Ultra compact layout for fitting on one page
    const compact = subjects.length >= 4;
    const baseFont = compact ? 5 : 6;
    const headerFont = compact ? 6 : 7;

    // School logo as canvas drawing - smaller
    const logoCanvas = {
      canvas: [
        { type: 'ellipse', x: 15, y: 15, r1: 12, r2: 12, color: colors.accent },
        { type: 'text', x: 15, y: 18, text: 'LOGO', fontSize: 6, color: 'white', alignment: 'center' }
      ]
    };

    // Header rows with better styling
    const headerRow1: any[] = [
      { text: 'S.N', style: 'th', rowSpan: 2, alignment: 'center' },
      { text: 'Student', style: 'th', rowSpan: 2 },
      { text: 'Roll', style: 'th', rowSpan: 2, alignment: 'center' },
      { text: 'ID', style: 'th', rowSpan: 2, alignment: 'center' },
    ];
    subjects.forEach((sub: any) => {
      headerRow1.push({ text: String(sub.name || '-'), style: 'th', colSpan: 3, alignment: 'center' });
      headerRow1.push({});
      headerRow1.push({});
    });
    headerRow1.push({ text: 'TH Total', style: 'th', rowSpan: 2, alignment: 'center' });
    headerRow1.push({ text: 'Percent', style: 'th', rowSpan: 2, alignment: 'center' });
    headerRow1.push({ text: 'Rank', style: 'th', rowSpan: 2, alignment: 'center' });
    headerRow1.push({ text: 'Division', style: 'th', rowSpan: 2, alignment: 'center' });

    const headerRow2: any[] = [ '', '', '', '' ];
    subjects.forEach(() => {
      headerRow2.push({ text: 'TH', style: 'th2', alignment: 'center' });
      headerRow2.push({ text: 'PR', style: 'th2', alignment: 'center' });
      headerRow2.push({ text: 'Total', style: 'th2', alignment: 'center' });
    });

    const body: any[] = [ headerRow1, headerRow2 ];

    students.forEach((stu: any, idx: number) => {
      let thTotal = 0, grandTotal = 0;
      const row: any[] = [
        { text: String(idx + 1), alignment: 'center', fontSize: baseFont },
        { text: String(stu.name || '-'), fontSize: baseFont },
        { text: String(stu.rollNo ?? '-'), alignment: 'center', fontSize: baseFont },
        { text: String(stu.studentCode ?? '-'), alignment: 'center', fontSize: baseFont },
      ];

      subjects.forEach((sub: any) => {
        const subjParts = (partsBySubject.get(sub.id) || []);
        const thPart = subjParts.find((p: any) => isTH(p));
        const prPart = subjParts.find((p: any) => isPR(p));
        const thConv = thPart ? sumForConv(stu.studentId, sub.id, (mk) => mk.subjectPartId === thPart.id) : sumForConv(stu.studentId, sub.id, () => true);
        const prConv = prPart ? sumForConv(stu.studentId, sub.id, (mk) => mk.subjectPartId === prPart.id) : 0;
        const totConv = Number(thConv) + Number(prConv);
        thTotal += Number(thConv) || 0;
        grandTotal += Number(totConv) || 0;
        row.push({ text: num2(thConv), alignment: 'center', fontSize: baseFont });
        row.push({ text: prPart ? num2(prConv) : '0.00', alignment: 'center', fontSize: baseFont });
        row.push({ text: num2(totConv), alignment: 'center', fontSize: baseFont, bold: true });
      });

      // Total column and grade metrics
      row.push({ text: num2(thTotal), alignment: 'center', fontSize: baseFont, bold: true });
      const percent = (typeof stu.percentage === 'number' ? stu.percentage : (typeof stu.percent === 'number' ? stu.percent : null));
      row.push({ text: (percent != null ? `${num2(percent)}%` : '-'), alignment: 'center', fontSize: baseFont });
      row.push({ text: String(stu.rank ?? '-'), alignment: 'center', fontSize: baseFont });
      row.push({ text: String(stu.grade ?? '-'), alignment: 'center', fontSize: baseFont });
      body.push(row);
    });

    // Calculate column widths dynamically - more compact
    const baseWidths = [12, 45, 16, 18]; // S.N, Student, Roll, ID
    const extraCols = [18, 22, 16, 20]; // TH Total, Percent, Rank, Division
    const availableWidth = 700 - baseWidths.reduce((a, b) => a + b, 0) - extraCols.reduce((a, b) => a + b, 0);
    const subjectWidth = Math.max(14, Math.floor(availableWidth / (subjects.length * 3))); // Distribute remaining width
    const widths: any[] = [...baseWidths];
    subjects.forEach(() => { 
      widths.push(subjectWidth, subjectWidth, subjectWidth); // TH, PR, Total
    });
    widths.push(...extraCols); // TH Total, Percent, Rank, Division

    const content: any[] = [
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  // Header with school details and logo
                  {
                    columns: [
                      { width: 30, stack: [logoCanvas] },
                      { 
                        width: '*', 
                        stack: [
                          { text: data.userProfile?.schoolName || 'School Name', style: 'schoolName', alignment: 'center' },
                          { text: data.userProfile?.schoolAddress || 'School Address', style: 'schoolAddress', alignment: 'center' },
                          { text: `Phone: ${data.userProfile?.schoolPhone || 'N/A'} | Email: ${data.userProfile?.schoolEmail || 'N/A'}`, style: 'schoolContact', alignment: 'center' }
                        ]
                      },
                      { width: 30, text: '' }
                    ],
                    margin: [0, 0, 0, 5]
                  },
                  
                  // Title
                  { 
                    text: `Exam Result — ${exam?.name || ''} ${exam?.term ? `(${exam.term})` : ''}`, 
                    style: 'title', 
                    alignment: 'center', 
                    margin: [0, 2, 0, 1] 
                  },
                  { 
                    text: `Year: ${year || '-'}   Class: ${selectedClass?.name || '-'}`, 
                    style: 'subtitle', 
                    alignment: 'center', 
                    margin: [0, 0, 0, 4] 
                  },
                  
                  // Results table
                  {
                    table: { 
                      headerRows: 2, 
                      widths, 
                      body,
                      dontBreakRows: true
                    },
                    layout: {
                      hLineColor: () => colors.accent,
                      vLineColor: () => colors.accent,
                      hLineWidth: () => 0.3,
                      vLineWidth: () => 0.3,
                      fillColor: (rowIndex: number) => {
                        if (rowIndex === 0 || rowIndex === 1) return colors.accentLight;
                        return rowIndex % 2 === 0 ? colors.background : null;
                      },
                      paddingLeft: () => 2,
                      paddingRight: () => 2,
                      paddingTop: () => 1,
                      paddingBottom: () => 1,
                    },
                    margin: [0, 0, 0, 4],
                  },
                  
                  // Signature section
                  {
                    columns: [
                      { 
                        width: '*', 
                        stack: [ 
                          { text: 'Prepared by', bold: true, margin: [0, 4, 0, 1], fontSize: 7 }, 
                          { canvas: [ { type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 0.3, color: colors.accent } ] }, 
                          { text: String(data.userProfile?.name || 'Teacher Name'), margin: [0, 2, 0, 0], fontSize: 6 } 
                        ] 
                      },
                      { width: 30, text: '' },
                      { 
                        width: '*', 
                        alignment: 'right', 
                        stack: [ 
                          { text: 'Approved by', bold: true, margin: [0, 4, 0, 1], fontSize: 7 }, 
                          { canvas: [ { type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 0.3, color: colors.accent } ] }, 
                          { text: String(data.userProfile?.principalName || 'Principal Name'), margin: [0, 2, 0, 0], fontSize: 6 } 
                        ] 
                      },
                    ],
                    columnGap: 15,
                    margin: [0, 2, 0, 0]
                  }
                ],
                border: [false, false, false, false]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 2,
          vLineWidth: () => 2,
          hLineColor: () => colors.accent,
          vLineColor: () => colors.accent,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        }
      }
    ];

    const dd: any = {
      pageOrientation: 'landscape',
      pageMargins: [10, 10, 10, 10],
      content,
      styles: {
        schoolName: { fontSize: 12, bold: true, color: colors.accent },
        schoolAddress: { fontSize: 7, color: '#666666' },
        schoolContact: { fontSize: 6, color: '#666666' },
        title: { fontSize: 10, bold: true, color: colors.accent },
        subtitle: { fontSize: 8, color: '#666666' },
        th: { 
          bold: true, 
          fontSize: headerFont, 
          color: colors.accent,
          fillColor: colors.accentLight
        },
        th2: { 
          bold: true, 
          fontSize: headerFont - 1, 
          color: colors.accent,
          fillColor: colors.accentLight
        },
      },
      defaultStyle: { fontSize: baseFont },
    };
    return dd;
  }

  function exportSelectedExamPDF() {
    const dd = buildSelectedExamPDFDoc();
    (pdfMake as any).createPdf(dd).download('selected-exam-subject-breakdown.pdf');
  }

  const dirIcon = useMemo(() => (dir === "asc" ? "▲" : "▼"), [dir]);
  const markMap = useMemo(() => {
    const m = new Map<string, { obtained: number; converted: number }>();
    (data.marks || []).forEach((mk: any) => {
      m.set(`${mk.studentId}:${mk.subjectId}`, { obtained: Number(mk.obtained), converted: Number(mk.converted) });
    });
    return m;
  }, [data.marks]);

  // Part helpers (TH/PR)
  const thPartIds = useMemo(() => (data.parts || []).filter((p: any) => isTH(p)).map((p: any) => p.id), [data.parts]);
  const prPartIds = useMemo(() => (data.parts || []).filter((p: any) => isPR(p)).map((p: any) => p.id), [data.parts]);
  const hasTH = thPartIds.length > 0;
  const hasPR = prPartIds.length > 0;
  const anyConversion = Boolean(data.anyConversion);

  // Parts by subject for fast lookup
  const partsBySubject = useMemo(() => {
    const m = new Map<string, any[]>();
    (data.parts || []).forEach((p: any) => {
      const arr = m.get(p.subjectId) || [];
      arr.push(p);
      m.set(p.subjectId, arr);
    });
    return m;
  }, [data.parts]);

  // Derived filters
  const years = useMemo(() => {
    const ys = Array.from(new Set((data.exams || []).map((e: any) => String(e.year || "")))).filter(Boolean);
    ys.sort((a, b) => Number(b) - Number(a));
    return ys;
  }, [data.exams]);
  const classesForYear = useMemo(() => {
    const seen = new Set<string>();
    return (data.exams || [])
      .filter((e: any) => (year ? String(e.year) === String(year) : true))
      .map((e: any) => ({ id: e.classId, name: `${e.className} - ${e.classSection}` }))
      .filter((c: any) => {
        if (!c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
  }, [data.exams, year]);
  const examsForSelection = useMemo(() => {
    return (data.exams || []).filter((e: any) => {
      if (year && String(e.year) !== String(year)) return false;
      if (classId && e.classId !== classId) return false;
      return true;
    });
  }, [data.exams, year, classId]);

  // Auto-reset downstream selections when upstream changes
  useEffect(() => {
    // if selected class doesn't belong to selected year, clear it
    if (classId) {
      const ok = (data.exams || []).some((e: any) => e.classId === classId && (!year || String(e.year) === String(year)));
      if (!ok) setClassId("");
    }
    // clear exam if it doesn't match filters
    if (examId) {
      const ok = examsForSelection.some((e: any) => e.id === examId);
      if (!ok) setExamId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, classId, data.exams]);

  // Removed class-wide CSV export

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Results Reports</h1>
        </div>

        {/* Back Button */}
        <div className="mb-8">
          <a href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-gray-700 font-medium">Back to Dashboard</span>
          </a>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Filter Results</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Academic Year</label>
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)} 
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all duration-200"
                >
                  <option value="">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Class</label>
                <select 
                  value={classId} 
                  onChange={(e) => setClassId(e.target.value)} 
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all duration-200"
                >
                  <option value="">{year ? "Select Class" : "All Classes"}</option>
                  {classesForYear.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Exam</label>
                <select 
                  value={examId} 
                  onChange={(e) => setExamId(e.target.value)} 
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all duration-200"
                >
                  <option value="">Select Exam</option>
                  {examsForSelection.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.term} {e.year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Selected Exam Results</h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Theme Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-white text-sm font-medium">Theme:</label>
                  <select
                    value={pdfTheme}
                    onChange={(e) => setPdfTheme(e.target.value as any)}
                    className="px-3 py-1.5 bg-white/20 border border-white/30 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <option value="blue" className="text-gray-900">Blue</option>
                    <option value="purple" className="text-gray-900">Purple</option>
                    <option value="green" className="text-gray-900">Green</option>
                    <option value="red" className="text-gray-900">Red</option>
                    <option value="orange" className="text-gray-900">Orange</option>
                    <option value="teal" className="text-gray-900">Teal</option>
                  </select>
                </div>
                
                <button
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50"
                  onClick={exportSelectedExamPDF}
                  disabled={!examId || (data.results || []).length === 0}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            {!examId ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No exam selected</p>
                <p className="text-gray-400 mt-1">Please select an exam to view results</p>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm min-w-[1600px]">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700" rowSpan={2}>S.N</th>
                      <th className="text-left px-3 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700" rowSpan={2}>Student</th>
                      <th className="text-left px-3 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700" rowSpan={2}>Roll</th>
                      <th className="text-left px-3 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700" rowSpan={2}>ID</th>
                      {(data.subjects || []).map((sub: any) => (
                        <th key={`h-${sub.id}`} className="text-center px-3 py-3 border-b border-gray-200 bg-blue-50 font-semibold text-gray-700" colSpan={7}>{sub.name}</th>
                      ))}
                      <th className="text-center px-3 py-3 border-b border-gray-200 bg-blue-50 font-semibold text-gray-700 text-xs" rowSpan={2}>Total Conv</th>
                      <th className="text-left px-3 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700 whitespace-nowrap" rowSpan={2}>Percent</th>
                      <th className="text-left px-3 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700 whitespace-nowrap" rowSpan={2}>Rank</th>
                      <th className="text-left px-3 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700 whitespace-nowrap" rowSpan={2}>Division</th>
                      <th className="text-left px-3 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700 whitespace-nowrap" style={{ width: 72 }} rowSpan={2}>Copy</th>
                      <th className="text-left px-3 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-700 whitespace-nowrap" style={{ width: 64 }} rowSpan={2}>View</th>
                    </tr>
                    <tr>
                      {(data.subjects || []).map((sub: any) => (
                        <React.Fragment key={`sh-${sub.id}`}>
                          <th className="text-center px-2 py-2 border-b border-gray-200 bg-blue-50 font-medium text-gray-600 text-xs">Obt TH. Mark</th>
                          <th className="text-center px-2 py-2 border-b border-gray-200 bg-blue-50 font-medium text-gray-600 text-xs">Convt In</th>
                          <th className="text-center px-2 py-2 border-b border-gray-200 bg-blue-50 font-medium text-gray-600 text-xs">Convtd TH</th>
                          <th className="text-center px-2 py-2 border-b border-gray-200 bg-blue-50 font-medium text-gray-600 text-xs">Obt PR Mark</th>
                          <th className="text-center px-2 py-2 border-b border-gray-200 bg-blue-50 font-medium text-gray-600 text-xs">Convt In</th>
                          <th className="text-center px-2 py-2 border-b border-gray-200 bg-blue-50 font-medium text-gray-600 text-xs">Convtd PR</th>
                          <th className="text-center px-2 py-2 border-b border-gray-200 bg-blue-50 font-medium text-gray-600 text-xs">Total Conv Obt</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.results || []).length === 0 ? (
                      <tr>
                        <td className="py-8 text-center text-gray-500" colSpan={4 + ((data.subjects || []).length * 7) + 6}>
                          <div className="flex flex-col items-center">
                            <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="font-medium">No results available</p>
                            <p className="text-sm text-gray-400 mt-1">Results will appear here once available</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.results.map((r: any, idx: number) => {
                        const rank = (r.rank ?? "-");
                        const grade = (r.grade ?? "-");
                        const percent = (r.percentage ?? r.percent ?? null);
                        let totalSumConv = 0;
                        // per-part conv-in cache per subject
                        return (
                          <tr key={r.studentId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-3 text-gray-700">{idx + 1}</td>
                            <td className="py-3 px-3 font-medium text-gray-900">{r.name}</td>
                            <td className="py-3 px-3 text-gray-700">{r.rollNo}</td>
                            <td className="py-3 px-3 text-gray-700">{r.studentCode ?? '-'}</td>
                            {(data.subjects || []).map((sub: any) => {
                              const subjParts = partsBySubject.get(sub.id) || [];
                              const hasParts = subjParts.length > 0;
                              const thPart = subjParts.find((p: any) => isTH(p));
                              const prPart = subjParts.find((p: any) => isPR(p));
                              const sumForRaw = (predicate: (mk: any) => boolean) =>
                                (data.marks || []).reduce((acc, mk: any) => (
                                  mk.studentId === r.studentId && mk.subjectId === sub.id && predicate(mk)
                                    ? acc + (Number(mk.obtained) || 0)
                                    : acc
                                ), 0);
                              const sumForConv = (predicate: (mk: any) => boolean) =>
                                (data.marks || []).reduce((acc, mk: any) => (
                                  mk.studentId === r.studentId && mk.subjectId === sub.id && predicate(mk)
                                    ? acc + (Number(mk.converted) || 0)
                                    : acc
                                ), 0);
                              const thRaw = hasParts ? (thPart ? sumForRaw((mk) => mk.subjectPartId === thPart.id) : 0) : sumForRaw(() => true);
                              const thConv = hasParts ? (thPart ? sumForConv((mk) => mk.subjectPartId === thPart.id) : 0) : sumForConv(() => true);
                              const prRaw = hasParts ? (prPart ? sumForRaw((mk) => mk.subjectPartId === prPart.id) : 0) : 0;
                              const prConv = hasParts ? (prPart ? sumForConv((mk) => mk.subjectPartId === prPart.id) : 0) : 0;
                              const totConv = hasParts ? sumForConv(() => true) : thConv;
                              totalSumConv += Number(totConv) || 0;
                              const thConvIn = thPart ? (() => { const ps = partSettingById.get(thPart.id); return ps ? (ps.hasConversion && ps.convertToMark != null ? Number(ps.convertToMark) : Number(ps.fullMark)) : null; })() : null;
                              const prConvIn = prPart ? (() => { const ps = partSettingById.get(prPart.id); return ps ? (ps.hasConversion && ps.convertToMark != null ? Number(ps.convertToMark) : Number(ps.fullMark)) : null; })() : null;
                              return (
                                <React.Fragment key={`c-${r.studentId}-${sub.id}`}>
                                  <td className="py-3 px-3 text-gray-700 text-center">{num2(thRaw)}</td>
                                  <td className="py-3 px-3 text-gray-700 text-center">{thConvIn != null ? num2(thConvIn) : '-'}</td>
                                  <td className="py-3 px-3 text-gray-700 text-center">{num2(thConv)}</td>
                                  <td className="py-3 px-3 text-gray-700 text-center">{hasParts ? num2(prRaw) : '-'}</td>
                                  <td className="py-3 px-3 text-gray-700 text-center">{hasParts ? (prConvIn != null ? num2(prConvIn) : '-') : '-'}</td>
                                  <td className="py-3 px-3 text-gray-700 text-center">{hasParts ? num2(prConv) : '-'}</td>
                                  <td className="py-3 px-3 text-gray-700 text-center font-medium">{num2(totConv)}</td>
                                </React.Fragment>
                              );
                            })}
                            <td className="py-3 px-2 text-xs text-center font-bold text-gray-900" style={{ width: 64 }}>{num2(totalSumConv)}</td>
                            <td className="py-3 px-3 whitespace-nowrap text-center font-medium text-gray-900">{typeof percent === 'number' ? `${num2(percent)}%` : '-'}</td>
                            <td className="py-3 px-3 whitespace-nowrap text-center font-medium text-gray-900">{rank}</td>
                            <td className="py-3 px-3 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                grade === 'A+' ? 'bg-green-100 text-green-800' :
                                grade === 'A' ? 'bg-blue-100 text-blue-800' :
                                grade === 'B+' ? 'bg-yellow-100 text-yellow-800' :
                                grade === 'B' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {grade}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {r.shareToken ? (
                                <button 
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all duration-200 text-xs" 
                                  onClick={() => copy(shareUrl(r.shareToken))}
                                >
                                  Copy Link
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">Unpublished</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <Link 
                                className="inline-flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all duration-200 text-xs" 
                                href={`/dashboard/students/${r.studentId}?examId=${encodeURIComponent(examId || "")}`}
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
