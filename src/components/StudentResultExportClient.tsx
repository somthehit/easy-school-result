"use client";

import React, { useEffect, useMemo, useState } from "react";
import { safeApiCall } from "@/lib/api-utils";

// Safe pdfMake initialization with fallback
let pdfMake: any = null;
let pdfMakeReady = false;

const initializePdfMake = async () => {
  if (pdfMakeReady) return true;
  
  try {
    const [pdfMakeModule, vfsFonts] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts')
    ]);
    
    pdfMake = pdfMakeModule.default;
    const __vfs = (vfsFonts as any)?.pdfMake?.vfs || (vfsFonts as any)?.vfs;
    if (__vfs) {
      pdfMake.vfs = __vfs;
    }
    pdfMakeReady = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize pdfMake:', error);
    return false;
  }
};

export type SubjectItem = { id: string; name: string; convertTo?: number };

export default function StudentResultExportClient({
  student,
  mode,
  exam,
  year,
  subjects,
  single,
  finalData,
  parts,
  yearMarks,
  defaults,
  anyConvSingle: anyConvSingleProp,
  anyConvFinal: anyConvFinalProp,
}: {
  student: {
    name: string;
    className?: string;
    rollNo?: number | null;
    section?: string | null;
    dob?: string | Date | null;
    contact?: string | null;
    parentName?: string | null;
    address?: string | null;
  };
  mode: "single" | "final";
  exam?: { id: string; name: string; year?: number } | null;
  year?: number | null;
  subjects: SubjectItem[];
  single?: {
    rows: Array<{ subjectName: string; obtained: number | null; converted: number | null }>;
    totals: { totalObt: number; totalConv: number };
    summary?: { percentage?: number | null; rank?: number | null; division?: string | null };
  } | null;
  finalData?: {
    exams: Array<{ id: string; name: string }>;
    marksByExam: Record<string, Record<string, { obtained: number | null; converted: number | null }>>;
    totalsByExam: Record<string, { obt: number; conv: number }>;
    summary?: { finalTotal?: number | null; finalAvgPercent?: number | null; finalRank?: number | null; finalDivision?: string | null };
  } | null;
  parts?: Array<{ id: string; subjectId: string; name: string }> | null;
  yearMarks?: Array<{ examId: string; subjectId: string; subjectPartId: string | null; obtained: number | null; converted?: number | null }>; // for final mode part-wise
  defaults?: {
    schoolName?: string | null;
    schoolAddress?: string | null;
    estb?: string | null;
    preparedBy?: string | null;
    checkedBy?: string | null;
    approvedBy?: string | null;
    parentSignatureLabel?: string | null;
  } | null;
  anyConvSingle?: boolean;
  anyConvFinal?: boolean;
}) {
  // We only support the Transcript template now
  // School and footer details (editable)
  const [template, setTemplate] = useState<"transcript" | "detailed">("transcript");
  const [theme, setTheme] = useState<"blue" | "purple" | "green" | "red" | "orange" | "teal">("purple");
  const [schoolName, setSchoolName] = useState<string>(defaults?.schoolName ?? "");
  const [schoolAddress, setSchoolAddress] = useState<string>(defaults?.schoolAddress ?? "");
  const [estb, setEstb] = useState<string>(defaults?.estb ?? "");
  const [remarks, setRemarks] = useState<string>("");
  const [preparedBy, setPreparedBy] = useState<string>("Teacher");
  const [checkedBy, setCheckedBy] = useState<string>("");
  const [approvedBy, setApprovedBy] = useState<string>("");
  // Parent is sourced from student's record; no manual input

  // Initialize from defaults (when provided)
  useEffect(() => {
    if (!defaults) return;
    if (defaults.schoolName != null) setSchoolName(defaults.schoolName);
    if (defaults.schoolAddress != null) setSchoolAddress(defaults.schoolAddress);
    if (defaults.estb != null) setEstb(defaults.estb);
    if (defaults.preparedBy != null) setPreparedBy(defaults.preparedBy);
    if (defaults.checkedBy != null) setCheckedBy(defaults.checkedBy);
    if (defaults.approvedBy != null) setApprovedBy(defaults.approvedBy);
    // parent comes from student's record, not defaults
  }, [defaults]);

  const title = useMemo(() => {
    if (mode === "single") return `Result Sheet — ${exam?.name ?? "Exam"}`;
    return `Final Result — ${year ?? "Year"}`;
  }, [mode, exam?.name, year]);

  // Effective values: prefer local state, else fall back to defaults
  const effective = useMemo(() => ({
    schoolName: (schoolName && schoolName.trim()) || (defaults?.schoolName && defaults.schoolName.trim()) || "",
    schoolAddress: (schoolAddress && schoolAddress.trim()) || (defaults?.schoolAddress && defaults.schoolAddress.trim()) || "",
    estb: (estb && estb.trim()) || (defaults?.estb && String(defaults.estb).trim()) || "",
    preparedBy: (preparedBy && preparedBy.trim()) || (defaults?.preparedBy && defaults.preparedBy.trim()) || "",
    checkedBy: (checkedBy && checkedBy.trim()) || (defaults?.checkedBy && defaults.checkedBy.trim()) || "",
    approvedBy: (approvedBy && approvedBy.trim()) || (defaults?.approvedBy && defaults.approvedBy.trim()) || "",
  }), [schoolName, schoolAddress, estb, preparedBy, checkedBy, approvedBy, defaults]);

  function toCSV(): string {
    const lines: string[] = [];
    // Header
    if (effective.schoolName) lines.push(csv(effective.schoolName));
    if (effective.schoolAddress || effective.estb) lines.push(csv(`${effective.schoolAddress}${effective.schoolAddress && effective.estb ? " | " : ""}${effective.estb ? `Estb. ${effective.estb}` : ""}`));
    const details: string[] = [csv(student.name)];
    if (student.className) details.push(csv(`Class: ${student.className}`));
    if (student.rollNo != null) details.push(csv(`Roll: ${student.rollNo}`));
    if (student.section && String(student.section).trim() !== "") details.push(csv(`Section: ${student.section}`));
    lines.push(details.join(","));
    const anyConvSingle = anyConvSingleProp != null ? anyConvSingleProp : !!(single?.rows || []).some((r) => r.converted != null && Number(r.converted) !== Number(r.obtained));
    const anyConvFinal = anyConvFinalProp != null ? anyConvFinalProp : !!(finalData?.exams || []).some((e) => {
      const map = finalData?.marksByExam?.[e.id] || {};
      return Object.values(map).some((m: any) => m && m.converted != null && Number(m.converted) !== Number(m.obtained));
    });

    if (mode === "single" && exam) {
      lines.push(`"Exam: ${exam.name}","Year: ${exam.year ?? ""}"`);
      // Single: TH/PR/Total using converted; default to TH when no parts
      lines.push(["Subject", "TH", "PR", "Total Obt"].map(csv).join(","));
      const partsArr = parts || [];
      const yMarks = (yearMarks || []).filter((m) => m.examId === exam.id);
      subjects.forEach((s) => {
        const subjParts = partsArr.filter((p) => p.subjectId === s.id);
        const hasParts = subjParts.length > 0;
        const thPart = subjParts.find((p) => String(p.name).toUpperCase() === "TH");
        const prPart = subjParts.find((p) => String(p.name).toUpperCase() === "PR");
        const sumFor = (pred: (mk: any) => boolean) => yMarks.reduce((acc, mk) => (mk.subjectId === s.id && pred(mk) ? acc + (Number(mk.converted ?? mk.obtained) || 0) : acc), 0);
        const th = hasParts ? (thPart ? sumFor((mk) => mk.subjectPartId === thPart.id) : 0) : sumFor(() => true);
        const pr = hasParts ? (prPart ? sumFor((mk) => mk.subjectPartId === prPart.id) : 0) : 0;
        const tot = hasParts ? sumFor(() => true) : th;
        lines.push([csv(s.name), String(th), String(pr), String(tot)].join(","));
      });
      // Totals row
      let thSum = 0, prSum = 0, totSum = 0;
      yMarks.forEach((mk) => {
        const sp = (partsArr || []).find((p) => p.id === mk.subjectPartId);
        const val = Number(mk.converted ?? mk.obtained) || 0;
        if (sp) {
          const nm = String(sp.name).toUpperCase();
          if (nm === "TH") thSum += val; else if (nm === "PR") prSum += val;
        } else {
          const hasPartsForSubject = (partsArr || []).some((p) => p.subjectId === mk.subjectId);
          if (!hasPartsForSubject) thSum += val;
        }
        totSum += val;
      });
      lines.push(["Total", String(thSum), String(prSum), String(totSum)].join(","));
      if (single?.summary) {
        lines.push(`Percentage,${num(single.summary.percentage)}%`);
        lines.push(`Rank,${num(single.summary.rank)}`);
        lines.push(`Division,${single.summary.division ?? "-"}`);
      }
    } else if (mode === "final" && finalData) {
      lines.push(`"Year: ${year ?? ""}"`);
      // Build TH/PR/Total headers per exam + final total
      const head = ["Subject"]; 
      finalData.exams.forEach((e) => {
        head.push(`${e.name} TH`, `${e.name} PR`, `${e.name} Total Obt`);
      });
      head.push("Total Obt.");
      lines.push(head.map(csv).join(","));

      const partsArr = parts || [];
      const yMarks = yearMarks || [];
      subjects.forEach((s) => {
        const row: string[] = [csv(s.name)];
        let totalAcross = 0;
        finalData.exams.forEach((e) => {
          const subjParts = partsArr.filter((p) => p.subjectId === s.id);
          const hasParts = subjParts.length > 0;
          const thPart = subjParts.find((p) => String(p.name).toUpperCase() === "TH");
          const prPart = subjParts.find((p) => String(p.name).toUpperCase() === "PR");
          const sumFor = (pred: (mk: any) => boolean) => yMarks.reduce((acc, mk) => (mk.examId === e.id && mk.subjectId === s.id && pred(mk) ? acc + (Number(mk.obtained) || 0) : acc), 0);
          const th = hasParts ? (thPart ? sumFor((mk) => mk.subjectPartId === thPart.id) : 0) : sumFor(() => true);
          const pr = hasParts ? (prPart ? sumFor((mk) => mk.subjectPartId === prPart.id) : 0) : 0;
          const tot = hasParts ? sumFor(() => true) : th;
          totalAcross += tot;
          row.push(String(th), String(pr), String(tot));
        });
        row.push(String(totalAcross));
        lines.push(row.join(","));
      });
      // Totals row per exam
      const totalRow: string[] = ["Total"]; 
      let grandTot = 0;
      finalData.exams.forEach((e) => {
        let thSum = 0, prSum = 0, totSum = 0;
        (yearMarks || []).forEach((mk) => {
          if (mk.examId !== e.id) return;
          const sp = (parts || []).find((p) => p.id === mk.subjectPartId);
          if (sp) {
            const nm = String(sp.name).toUpperCase();
            if (nm === "TH") thSum += Number(mk.obtained) || 0;
            else if (nm === "PR") prSum += Number(mk.obtained) || 0;
          } else {
            const hasPartsForSubject = (parts || []).some((p) => p.subjectId === mk.subjectId);
            if (!hasPartsForSubject) thSum += Number(mk.obtained) || 0;
          }
          totSum += Number(mk.obtained) || 0;
        });
        grandTot += totSum;
        totalRow.push(String(thSum), String(prSum), String(totSum));
      });
      totalRow.push(String(grandTot));
      lines.push(totalRow.join(","));
      if (finalData.summary) {
        lines.push(`Final Total,${num(finalData.summary.finalTotal)}`);
        lines.push(`Average %,${num(finalData.summary.finalAvgPercent)}%`);
        lines.push(`Final Rank,${num(finalData.summary.finalRank)}`);
        lines.push(`Final Division,${finalData.summary.finalDivision ?? "-"}`);
      }
    }
    if (remarks) {
      lines.push("");
      lines.push(`Remarks,${csv(remarks)}`);
    }
    const sigParts: string[] = [];
    if (effective.preparedBy) sigParts.push(`Prepared By,${csv(effective.preparedBy)}`);
    if (effective.checkedBy) sigParts.push(`Checked By,${csv(effective.checkedBy)}`);
    if (effective.approvedBy) sigParts.push(`Approved By,${csv(effective.approvedBy)}`);
    // Always include parent from student's record
    sigParts.push(`Parent/Guardian,${csv(student.parentName ?? "-")}`);
    if (sigParts.length) {
      lines.push("");
      lines.push(sigParts.join(","));
    }
    return lines.join("\n");
  }

  function num(v: number | null | undefined): string {
    if (v == null || Number.isNaN(Number(v))) return "";
    return String(Number(v));
  }
  function csv(s: string): string {
    const safe = (s ?? "").replace(/"/g, '""');
    return `"${safe}"`;
  }

  function downloadCSV() {
    const content = toCSV();
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = mode === "single" ? (exam?.name ?? "exam") : `final-${year ?? "year"}`;
    a.download = `${student.name}-${base}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function buildDocDefinition() {
    // Theme colors with multiple options
    const getThemeColors = () => {
      switch (theme) {
        case 'blue':
          return { accent: '#1E3A8A', accentLight: '#dbeafe', background: '#f8fafc', lightBg: '#f0f9ff' };
        case 'purple':
          return { accent: '#6A0DAD', accentLight: '#ede9fe', background: '#fefbff', lightBg: '#fdf4ff' };
        case 'green':
          return { accent: '#059669', accentLight: '#d1fae5', background: '#f0fdf4', lightBg: '#ecfdf5' };
        case 'red':
          return { accent: '#DC2626', accentLight: '#fecaca', background: '#fef2f2', lightBg: '#fef2f2' };
        case 'orange':
          return { accent: '#EA580C', accentLight: '#fed7aa', background: '#fff7ed', lightBg: '#fff7ed' };
        case 'teal':
          return { accent: '#0D9488', accentLight: '#a7f3d0', background: '#f0fdfa', lightBg: '#f0fdfa' };
        default:
          return { accent: '#6A0DAD', accentLight: '#ede9fe', background: '#fefbff', lightBg: '#fdf4ff' };
      }
    };
    
    const { accent, accentLight, background, lightBg } = getThemeColors();
    const borderColor = '#e5e7eb';

    // Helpers used by transcript template
    function contactLine(): string | null {
      return student.contact ? `Contact: ${student.contact}` : null;
    }
    function dobLine(): string | null {
      // Accept a variety of possible DOB field names
      const anyStu = student as any;
      const raw =
        anyStu.dob ??
        anyStu.dateOfBirth ??
        anyStu.birthDate ??
        anyStu.dobAd ?? anyStu.dob_ad ??
        anyStu.dobBS ?? anyStu.dob_bs ??
        anyStu.date_of_birth ??
        null;
      if (!raw) return null;
      // If raw is a number or ISO-like string that Date can parse, format as DD/MM/YYYY
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yy = d.getFullYear();
          return `DOB : ${dd}/${mm}/${yy}`;
        }
      } catch {}
      // Fallback: show as provided
      return `DOB : ${String(raw)}`;
    }
    function gradeLegend(): any[] | null {
      // Horizontal grade legend with student summary
      const gradeData = [
        { range: '90-100', grade: 'A+', gpa: '4.0' },
        { range: '80-89', grade: 'A', gpa: '3.6' },
        { range: '70-79', grade: 'B+', gpa: '3.2' },
        { range: '60-69', grade: 'B', gpa: '2.8' },
        { range: '50-59', grade: 'C+', gpa: '2.4' },
        { range: '40-49', grade: 'C', gpa: '2.0' },
        { range: '33-39', grade: 'D', gpa: '1.2' },
        { range: '0-32', grade: 'F', gpa: '0.0' },
      ];
      
      // Get student summary data
      const percent = mode === 'single' ? (single?.summary?.percentage ?? null) : (finalData?.summary?.finalAvgPercent ?? null);
      const rank = mode === 'single' ? (single?.summary?.rank ?? null) : (finalData?.summary?.finalRank ?? null);
      const division = mode === 'single' ? (single?.summary?.division ?? null) : (finalData?.summary?.finalDivision ?? null);
      
      return [
        {
          columns: [
            {
              width: '65%',
              stack: [
                { text: 'Grade Legend', alignment: 'left', color: accent, bold: true, margin: [0, 0, 0, 6], fontSize: 12 },
                {
                  table: {
                    headerRows: 0,
                    widths: Array(gradeData.length).fill('*'),
                    body: [
                      gradeData.map(g => ({ text: g.range, style: 'legendTh', alignment: 'center' })),
                      gradeData.map(g => ({ text: g.grade, alignment: 'center', bold: true, fontSize: 10 })),
                      gradeData.map(g => ({ text: g.gpa, alignment: 'center', fontSize: 9 }))
                    ]
                  },
                  layout: {
                    fillColor: (rowIndex: number) => (rowIndex === 0 ? accent : (rowIndex === 1 ? accentLight : null)),
                    hLineColor: () => borderColor,
                    vLineColor: () => borderColor,
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 4,
                    paddingBottom: () => 4,
                  },
                }
              ]
            },
            {
              width: '35%',
              stack: [
                { text: 'Performance Summary', alignment: 'center', color: accent, bold: true, margin: [0, 0, 0, 6], fontSize: 12 },
                {
                  table: {
                    headerRows: 0,
                    widths: ['*', '*'],
                    body: [
                      [{ text: 'Percentage:', bold: true, fontSize: 9 }, { text: percent != null ? `${formatNum(percent)}%` : '-', alignment: 'right', bold: true, color: accent, fontSize: 10 }],
                      [{ text: 'Rank:', bold: true, fontSize: 9 }, { text: rank != null ? String(rank) : '-', alignment: 'right', bold: true, color: accent, fontSize: 10 }],
                      [{ text: 'Division:', bold: true, fontSize: 9 }, { text: division ?? '-', alignment: 'right', bold: true, color: accent, fontSize: 10 }]
                    ]
                  },
                  layout: {
                    fillColor: () => lightBg,
                    hLineColor: () => accent,
                    vLineColor: () => accent,
                    paddingLeft: () => 8,
                    paddingRight: () => 8,
                    paddingTop: () => 6,
                    paddingBottom: () => 6,
                  },
                }
              ]
            }
          ],
          margin: [0, 0, 0, 8]
        }
      ];
    }

    // Title-case a phrase (e.g., "first term" -> "First Term")
    function toTitle(s: string): string {
      if (!s) return '';
      return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }

    // Build a single-line header combining class and result title/year
    const combinedHeader = (() => {
      const clsRaw = student.className ?? "";
      // Avoid duplicating 'Class' if already present in className
      const cls = clsRaw && /^\s*class\b/i.test(clsRaw) ? clsRaw : (clsRaw ? `Class ${clsRaw}` : "");
      if (mode === "final") {
        // title already like: "Final Result — <year>"
        return cls ? `${cls} • ${title}` : title;
      }
      // single mode: "Exam Result — <exam name>"
      const singleTitle = `Exam Result — ${exam?.name ?? "Exam"}`;
      return cls ? `${cls} • ${singleTitle}` : singleTitle;
    })();

    // Modern header with school logo and name
    const headerBlock: any[] = [
      // School logo and name with decorative styling
      ...(effective.schoolName
        ? [{
            stack: [
              // School logo as decorative circle
              { 
                canvas: [
                  { type: 'ellipse', x: 265, y: 15, r1: 15, r2: 15, color: accent },
                  { type: 'text', x: 265, y: 20, text: 'SCHOOL', color: 'white', fontSize: 8, alignment: 'center' }
                ],
                margin: [0, 0, 0, 4]
              },
              { text: effective.schoolName, style: "schoolTitle", alignment: "center", margin: [0, 0, 0, 2], color: accent },
              { canvas: [{ type: "line", x1: 100, y1: 0, x2: 415, y2: 0, lineWidth: 2, lineColor: accent }] }
            ]
          } as any]
        : []),
      // School address with elegant formatting
      ...(effective.schoolAddress || effective.estb
        ? [{ 
            text: `${effective.schoolAddress}${effective.schoolAddress && effective.estb ? " • " : ""}${effective.estb ? `Estb. ${effective.estb}` : ""}`, 
            alignment: "center", 
            margin: [0, 1, 0, 4],
            fontSize: 9,
            color: '#64748b'
          } as any]
        : []),
      // Exam title with modern card-like design
      {
        table: {
          headerRows: 0,
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: `${exam?.name ?? 'Exam'} Result`, alignment: 'center', bold: true, fontSize: 14, color: 'white', margin: [0, 6, 0, 2] },
                { text: (() => {
                    const yr = (mode === 'single' ? (exam?.year ?? '') : (year ?? ''));
                    const cls = student.className ? `Class: ${student.className}` : '';
                    const sec = student.section ? ` • ${student.section}` : '';
                    const parts: string[] = [];
                    if (yr !== '') parts.push(`Year: ${yr}`);
                    if (cls) parts.push(`${cls}${sec}`);
                    return parts.join('     ');
                  })(), alignment: 'center', color: 'white', fontSize: 10, margin: [0, 0, 0, 6] }
              ]
            }
          ]]
        },
        layout: {
          fillColor: () => accent,
          hLineColor: () => accent,
          vLineColor: () => accent,
        },
        margin: [0, 0, 0, 8]
      },
      // Student details in beautiful card format
      {
        table: {
          headerRows: 0,
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'Student Information', alignment: 'center', bold: true, fontSize: 12, color: accent, margin: [0, 0, 0, 6] },
                {
                  columns: [
                    {
                      width: '50%',
                      stack: [
                        { text: [{ text: 'Name: ', bold: true, fontSize: 9 }, { text: student.name, color: accent, bold: true, fontSize: 9 }], margin: [0, 0, 0, 2] },
                        { text: [{ text: 'Class: ', bold: true, fontSize: 9 }, { text: student.className ? `${student.className}${student.section ? ` ${student.section}` : ''}` : '-', color: accent, bold: true, fontSize: 9 }], margin: [0, 0, 0, 2] },
                        { text: [{ text: 'Roll No: ', bold: true, fontSize: 9 }, { text: String(student.rollNo ?? '-'), color: accent, bold: true, fontSize: 9 }], margin: [0, 0, 0, 2] }
                      ]
                    },
                    {
                      width: '50%',
                      stack: [
                        { text: [{ text: 'DOB: ', bold: true, fontSize: 9 }, { text: (dobLine()?.replace('DOB : ', '') ?? '-'), color: accent, bold: true, fontSize: 9 }], margin: [0, 0, 0, 2] },
                        { text: [{ text: 'Parent: ', bold: true, fontSize: 9 }, { text: student.parentName ?? '-', color: accent, bold: true, fontSize: 9 }], margin: [0, 0, 0, 2] },
                        { text: [{ text: 'Address: ', bold: true, fontSize: 9 }, { text: student.address ?? '–', color: accent, bold: true, fontSize: 9 }], margin: [0, 0, 0, 2] }
                      ]
                    }
                  ]
                },
                { text: 'Academic Performance Report', alignment: 'center', italics: true, fontSize: 10, color: '#64748b', margin: [0, 4, 0, 0] }
              ],
              margin: [6, 6, 6, 6]
            }
          ]]
        },
        layout: {
          fillColor: () => background,
          hLineColor: () => accent,
          vLineColor: () => accent,
          hLineWidth: () => 1,
          vLineWidth: () => 1
        },
        margin: [0, 0, 0, 3]
      },
    ];

    let content: any[] = [];

    if (mode === "single" && single && exam) {
      const partsArr = parts || [];
      const yMarks = (yearMarks || []).filter((m) => m.examId === exam.id);

      // Detailed layout: grouped TH/PR with Obtained/Conversion/Converted breakdown
        const body: any[] = [];
        body.push([
          { text: "S.N", style: "th", rowSpan: 2, alignment: 'center' },
          { text: "Subjects", style: "th", rowSpan: 2 },
          { text: "Theory", style: "th", colSpan: 3, alignment: 'center' }, {}, {},
          { text: "Practical", style: "th", colSpan: 3, alignment: 'center' }, {}, {},
          { text: "Total Obtained", style: "th", rowSpan: 2, alignment: 'center' },
          { text: "Grade", style: "th", rowSpan: 2, alignment: 'center' },
        ]);
        body.push([
          "", "",
          { text: "Obt.", style: "th2", alignment: 'center' },
          { text: "Conversion In", style: "th2", alignment: 'center' },
          { text: "Converted", style: "th2", alignment: 'center' },
          { text: "Obt.", style: "th2", alignment: 'center' },
          { text: "Conversion In", style: "th2", alignment: 'center' },
          { text: "Converted", style: "th2", alignment: 'center' },
          "", "",
        ]);

        const getSum = (subjId: string, pred: (mk: any) => boolean, useConv: boolean) =>
          yMarks.reduce((acc, mk) => (mk.subjectId === subjId && pred(mk) ? acc + (useConv ? (Number(mk.converted ?? mk.obtained) || 0) : (Number(mk.obtained) || 0)) : acc), 0);

        subjects.forEach((s, idx) => {
          const subjParts = partsArr.filter((p) => p.subjectId === s.id);
          const hasParts = subjParts.length > 0;
          const thPart = subjParts.find((p) => String(p.name).toUpperCase() === "TH");
          const prPart = subjParts.find((p) => String(p.name).toUpperCase() === "PR");
          
          // Get actual marks from single.rows if available
          const subjectRow = single?.rows?.find(row => row.subjectName === s.name);
          const thRaw = subjectRow?.obtained || 0;
          const thConv = subjectRow?.converted || 0;
          const prRaw = 0; // Most subjects don't have practical
          const prConv = 0;
          const totConv = thConv;
          
          // Get actual conversion factors from subject settings
          // Use the subject's "Convert To" value from exam settings
          const thConversionIn = s.convertTo || 30; // Use actual subject conversion setting
          const prConversionIn = 0;
          
          // Calculate grade based on actual converted marks percentage using subject's conversion setting
          const maxConvertedMarks = thConversionIn; // Use subject's actual conversion setting
          const percentage = maxConvertedMarks > 0 ? ((totConv / maxConvertedMarks) * 100) : 0;
          const grade = percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'B+' : percentage >= 50 ? 'B' : percentage >= 40 ? 'C' : 'F';

          body.push([
            { text: String(idx + 1), alignment: 'center' },
            { text: s.name },
            { text: formatNum(thRaw), alignment: 'center' },
            { text: String(thConversionIn), alignment: 'center' },
            { text: formatNum(thConv), alignment: 'center' },
            { text: String(prConversionIn), alignment: 'center' },
            { text: String(prConversionIn), alignment: 'center' },
            { text: formatNum(prConv), alignment: 'center' },
            { text: formatNum(totConv), alignment: 'center' },
            { text: grade, alignment: 'center' },
          ]);
        });

        // Totals
        let thRawSum = 0, thConvSum = 0, prRawSum = 0, prConvSum = 0, totConvSum = 0;
        let thConversionSum = 0, prConversionSum = 0;
        
        yMarks.forEach((mk) => {
          const sp = partsArr.find((p) => p.id === mk.subjectPartId);
          const raw = Number(mk.obtained) || 0;
          const conv = Number(mk.converted ?? mk.obtained) || 0;
          if (sp) {
            const nm = String(sp.name).toUpperCase();
            if (nm === 'TH') { 
              thRawSum += raw; 
              thConvSum += conv;
              thConversionSum += 30; // Default conversion factor
            }
            else if (nm === 'PR') { 
              prRawSum += raw; 
              prConvSum += conv;
              prConversionSum += 0; // Default conversion factor
            }
          } else {
            // subjects without parts count as TH
            thRawSum += raw; 
            thConvSum += conv;
            thConversionSum += 30;
          }
          totConvSum += conv;
        });

        body.push([
          { text: '', alignment: 'center' },
          { text: 'Total', bold: true },
          { text: formatNum(thRawSum), bold: true, alignment: 'center' },
          { text: formatNum(thConversionSum), bold: true, alignment: 'center' },
          { text: formatNum(thConvSum), bold: true, alignment: 'center' },
          { text: formatNum(prRawSum), bold: true, alignment: 'center' },
          { text: formatNum(prConversionSum), bold: true, alignment: 'center' },
          { text: formatNum(prConvSum), bold: true, alignment: 'center' },
          { text: formatNum(totConvSum), bold: true, alignment: 'center' },
          { text: '', alignment: 'center' },
        ]);

        content.push({
          table: {
            headerRows: 2,
            widths: [
              'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'
            ],
            body,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return accent;
              if (rowIndex === 1) return accentLight;
              return rowIndex % 2 === 0 ? background : null;
            },
            hLineColor: () => borderColor,
            vLineColor: () => borderColor,
            hLineWidth: (i: number, node: any) => (i <= 2 ? 2 : 1),
            vLineWidth: () => 1,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 0, 0, 4],
        });
        content.push({ 
          text: 'TH = Theory, PR = Practical. Marks show Obtained/Conversion/Converted breakdown.', 
          style: 'small', 
          italics: true, 
          alignment: 'center',
          color: '#64748b',
          margin: [0, 1, 0, 2] 
        });

        // Add grade legend and performance summary
        const legendContent = gradeLegend();
        if (legendContent && legendContent.length > 0) {
          content.push({ stack: legendContent, margin: [0, 2, 0, 4] });
        }
    }

    if (mode === "final" && finalData) {
      // Build TH/PR layout with default TH when no parts
      const body: any[] = [];
      const top: any[] = [
        { text: "S.N", style: "th", rowSpan: 2 },
        { text: "Subject", style: "th", rowSpan: 2 },
      ];
      finalData.exams.forEach((e) => {
        const label = `${toTitle(e.name || "Term")} Examination`;
        top.push({ text: label, style: "th", colSpan: 3, alignment: "center" });
        top.push({});
        top.push({});
      });
      top.push({ text: "Total Obt.", style: "th", rowSpan: 2 });
      const bottom: any[] = ["", ""];
      finalData.exams.forEach(() => {
        bottom.push({ text: "TH", style: "th2" });
        bottom.push({ text: "PR", style: "th2" });
        bottom.push({ text: "Total Obt", style: "th2" });
      });
      bottom.push("");
      body.push(top);
      body.push(bottom);

      const partsArr = parts || [];
      const yMarks = yearMarks || [];
      subjects.forEach((s, idx) => {
        const row: any[] = [
          { text: String(idx + 1) },
          { text: s.name },
        ];
        let totalAcross = 0;
        finalData.exams.forEach((e) => {
          // Get marks for this exam and subject from finalData.marksByExam
          const examMarks = finalData.marksByExam[e.id]?.[s.id];
          const obtained = examMarks?.obtained || 0;
          const converted = examMarks?.converted || obtained;
          
          // For now, show obtained marks in TH column and 0 in PR (since we don't have TH/PR breakdown in finalData)
          // This matches what's shown in the web interface
          const th = obtained;
          const pr = 0; // Most subjects don't have practical components
          const tot = obtained;
          
          totalAcross += tot;
          row.push({ text: formatNum(th) }, { text: formatNum(pr) }, { text: formatNum(tot) });
        });
        row.push({ text: formatNum(totalAcross) });
        body.push(row);
      });
      const totalsRow: any[] = ["", { text: "Total", bold: true }];
      let grandTot = 0;
      finalData.exams.forEach((e) => {
        // Calculate totals for this exam using finalData.totalsByExam
        const examTotals = finalData.totalsByExam[e.id];
        const thSum = examTotals?.obt || 0;
        const prSum = 0; // No practical breakdown in current data
        const totSum = examTotals?.obt || 0;
        
        grandTot += totSum;
        totalsRow.push({ text: formatNum(thSum), bold: true }, { text: formatNum(prSum), bold: true }, { text: formatNum(totSum), bold: true });
      });
      totalsRow.push({ text: formatNum(grandTot), bold: true });
      body.push(totalsRow);

      const resultTable = {
        table: { headerRows: 2, widths: [
          "auto", "*",
          ...finalData.exams.flatMap(() => ["auto", "auto", "auto"]),
          "auto",
        ], body },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? accent : (rowIndex === 1 ? accentLight : null)),
          hLineColor: () => borderColor,
          vLineColor: () => borderColor,
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
        },
        margin: [0, 6, 0, 6],
      } as any;
      content.push(resultTable);
      // Explain abbreviations
      content.push({ text: `Note: TH = Theory, PR = Practical, Obt = Obtained marks`, style: 'small', italics: true, margin: [0, 2, 0, 6] });

      if (finalData.summary) {
        const txtTotal = `Final Total: ${finalData.summary.finalTotal == null ? '-' : formatNum(finalData.summary.finalTotal)}`;
        const txtAvg = `Average %: ${finalData.summary.finalAvgPercent == null ? '-' : `${formatNum(finalData.summary.finalAvgPercent)}%`}`;
        const txtRank = `Final Rank: ${finalData.summary.finalRank ?? '-'}`;
        const txtDiv = `Final Division: ${finalData.summary.finalDivision ?? '-'}`;
        content.push({
          columns: [
            { width: 'auto', text: txtTotal },
            { width: 'auto', text: txtAvg, margin: [16, 0, 0, 0] },
            { width: 'auto', text: txtRank, margin: [16, 0, 0, 0] },
            { width: 'auto', text: txtDiv, margin: [16, 0, 0, 0] },
          ],
          margin: [0, 4, 0, 6],
        });
      }
    }

    const dd: any = {
      content: [
        ...headerBlock,
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: borderColor }] },
        ...content,
        
        // Modern remarks section
        {
          table: {
            headerRows: 0,
            widths: ['*'],
            body: [[
              {
                stack: [
                  { text: 'Teacher\'s Remarks', bold: true, fontSize: 12, color: accent, margin: [0, 0, 0, 4] },
                  { text: remarks || 'Excellent performance! Keep up the good work!', fontSize: 10, margin: [0, 0, 0, 0] }
                ],
                margin: [8, 6, 8, 6]
              }
            ]],
          },
          layout: {
            fillColor: () => lightBg,
            hLineColor: () => accent,
            vLineColor: () => accent,
            hLineWidth: () => 1.5,
            vLineWidth: () => 1.5,
          },
          margin: [0, 8, 0, 12],
        },
        // Move Grade Legend to bottom for all templates
        ...(() => {
          // Hide legend for single transcript to save space; show for detailed/final
          if (mode === 'single' && template === 'transcript') return [] as any;
          const legend = gradeLegend();
          return legend ? [{ stack: legend, margin: [0, 0, 0, 8] } as any] : [];
        })(),
        // Co-scholastic table placeholders (none for transcript)
        ...[],
        // Signature block
        ...(() => {
          const cols: any[] = [];
          // Modern signature design with icons
          const currentUser = effective.preparedBy || 'Teacher';
          cols.push({ width: "*", stack: [
            { text: "", margin: [0, 12, 0, 0] },
            { canvas: [{ type: "line", x1: 10, y1: 0, x2: 110, y2: 0, lineWidth: 1.5, lineColor: accent }] },
            { text: "Prepared By", alignment: "center", margin: [0, 4, 0, 2], bold: true, fontSize: 10, color: accent },
            { text: currentUser, alignment: "center", fontSize: 9, color: '#374151' },
          ] });
          // Remove Checked By section completely
          // Approved By with modern styling
          if (approvedBy && approvedBy.trim()) {
            cols.push({ width: "*", stack: [
              { text: "", margin: [0, 12, 0, 0] },
              { canvas: [{ type: "line", x1: 10, y1: 0, x2: 110, y2: 0, lineWidth: 1.5, lineColor: accent }] },
              { text: "Approved By", alignment: "center", margin: [0, 4, 0, 2], bold: true, fontSize: 10, color: accent },
              { text: approvedBy, alignment: "center", fontSize: 9, color: '#374151' },
            ] });
          }
          // Parent signature with cute icon
          cols.push({ width: "*", stack: [
            { text: "", margin: [0, 12, 0, 0] },
            { canvas: [{ type: "line", x1: 10, y1: 0, x2: 110, y2: 0, lineWidth: 1.5, lineColor: accent }] },
            { text: "Parent/Guardian", alignment: "center", margin: [0, 4, 0, 2], bold: true, fontSize: 10, color: accent },
            { text: student.parentName ?? '-', alignment: "center", fontSize: 9, color: '#374151' },
          ] });
          return [{ columns: cols, margin: [0, 8, 0, 4] }];
        })(),
      ],
      styles: {
        h0: { fontSize: 18, bold: true },
        h1: { fontSize: 16, bold: true, characterSpacing: 0.5 },
        h2: { fontSize: 12, bold: true },
        th: { bold: true, color: '#ffffff', alignment: 'center', fontSize: 10 },
        th2: { bold: true, color: '#111827', alignment: 'center', fontSize: 9 },
        legendTh: { bold: true, color: '#ffffff', alignment: 'center', fontSize: 9 },
        schoolTitle: { fontSize: 16, bold: true, characterSpacing: 0.8 },
        small: { fontSize: 9 },
      },
      defaultStyle: { fontSize: 9, lineHeight: 1.2 },
    };

    // Page setup with modern portrait design
    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [25, 20, 25, 20],
    };
    (dd as any).background = function (currentPage: number, pageSize: any) {
      return {
        canvas: [
          // Outer decorative border with rounded corners effect
          { type: 'rect', x: 15, y: 15, w: pageSize.width - 30, h: pageSize.height - 30, lineColor: accent, lineWidth: 3, r: 8 },
          // Inner elegant border
          { type: 'rect', x: 25, y: 25, w: pageSize.width - 50, h: pageSize.height - 50, lineColor: accentLight, lineWidth: 1.5, r: 6 },
          // Decorative corner elements
          { type: 'rect', x: 30, y: 30, w: 40, h: 3, color: accent },
          { type: 'rect', x: pageSize.width - 70, y: 30, w: 40, h: 3, color: accent },
          { type: 'rect', x: 30, y: pageSize.height - 33, w: 40, h: 3, color: accent },
          { type: 'rect', x: pageSize.width - 70, y: pageSize.height - 33, w: 40, h: 3, color: accent },
          // Subtle background pattern
          { type: 'rect', x: 35, y: 35, w: pageSize.width - 70, h: pageSize.height - 70, color: background, r: 4 }
        ]
      } as any;
    };

    // No other template tweaks

    return dd;
  }

  function formatNum(n: number) {
    return Number(n).toFixed(2);
  }

  async function exportPDF() {
    const initialized = await initializePdfMake();
    if (!initialized || !pdfMake) {
      alert("PDF export is currently unavailable. Please check your internet connection and try again.");
      return;
    }
    
    try {
      const dd = buildDocDefinition();
      const base = mode === "single" ? (exam?.name ?? "exam") : `final-${year ?? "year"}`;
      pdfMake.createPdf(dd).download(`${student.name}-${base}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert("Failed to generate PDF. Please try again.");
    }
  }

  async function printPDF() {
    const initialized = await initializePdfMake();
    if (!initialized || !pdfMake) {
      alert("PDF print is currently unavailable. Please check your internet connection and try again.");
      return;
    }
    
    try {
      const dd = buildDocDefinition();
      // Opens the browser print dialog for the generated PDF
      pdfMake.createPdf(dd).print();
    } catch (error) {
      console.error('PDF print failed:', error);
      alert("Failed to print PDF. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">Template:</span>
        <select value={template} onChange={(e) => setTemplate(e.target.value as any)} className="px-2 py-1 rounded-md border bg-transparent">
          <option value="transcript">Transcript</option>
          <option value="detailed">Detailed</option>
        </select>
        <span className="text-sm">Theme:</span>
        <select value={theme} onChange={(e) => setTheme(e.target.value as any)} className="px-2 py-1 rounded-md border bg-transparent">
          <option value="blue">Blue</option>
          <option value="purple">Purple</option>
          <option value="green">Green</option>
          <option value="red">Red</option>
          <option value="orange">Orange</option>
          <option value="teal">Teal</option>
        </select>
        <button onClick={printPDF} className="px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900">Print</button>
        <button onClick={exportPDF} className="px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900">Export PDF</button>
        <button onClick={downloadCSV} className="px-3 py-1.5 rounded-md border text-[#0F766E] border-[#0F766E] hover:bg-[#0F766E] hover:text-white">Export Excel (CSV)</button>
      </div>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <input placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="rounded-md border px-3 py-1.5 bg-transparent" />
      </div>
    </div>
  );
}
