"use client";

import { useState } from "react";

export default function VerifyAndMarksheet({ token }: { token: string }) {
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<null | {
    verified: boolean;
    student: { id: string; name: string; rollNo: number; classId: string; section?: string | null; studentCode?: string | null; fathersName?: string | null; mothersName?: string | null; parentName?: string | null };
    school?: { name: string; address: string; contact?: string; estb?: string; regNumber?: string; principalName?: string; principalContact?: string } | null;
    items: { examId: string; examName: string; term: string; total: number; percentage: number; grade: string; division: string }[];
    grandTotal: number;
    avgPercent: number;
    subjects?: { id: string; name: string; thTotal: number; prTotal: number; total: number }[];
    subjectTotals?: { thTotal: number; prTotal: number; total: number };
  }>(null);

  const violet = "#6A0DAD";

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public-result/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, dob }),
      });
      const result = await res.json();
      console.log('API Response:', result); // Debug log
      if (result.ok && result.verified) {
        setData(result);
      } else {
        setError(result.error || "Verification failed");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const num2 = (n: number) => Number(n).toFixed(2);

  const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      // If already loaded, resolve immediately
      if ((existing as any).readyState === 'complete') resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });

  const ensurePdfMake = async () => {
    // First attempt: local dynamic imports (minified UMD that sets global)
    try {
      await import('pdfmake/build/pdfmake.min.js');
      await import('pdfmake/build/vfs_fonts.js');
    } catch (_) {
      // ignore and try CDN fallback
    }
    if ((globalThis as any).pdfMake?.vfs) return (globalThis as any).pdfMake;
    // Second attempt: ESM shapes
    try {
      const pm = await import('pdfmake/build/pdfmake');
      const pdfMake = (pm as any).default || (pm as any);
      const fm: any = await import('pdfmake/build/vfs_fonts');
      const vfs = (fm as any).vfs || (fm as any).default?.vfs || (fm as any).pdfMake?.vfs || (globalThis as any).pdfMake?.vfs;
      if (vfs) {
        (pdfMake as any).vfs = vfs;
        (globalThis as any).pdfMake = pdfMake;
        (globalThis as any).pdfMake.vfs = vfs;
        return pdfMake;
      }
    } catch (_) {
      // ignore and try CDN fallback
    }
    // Final attempt: CDN
    await loadScript('https://cdn.jsdelivr.net/npm/pdfmake@0.2.9/build/pdfmake.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/pdfmake@0.2.9/build/vfs_fonts.js');
    if (!(globalThis as any).pdfMake?.vfs) {
      throw new Error('Unable to initialize pdfmake (vfs missing)');
    }
    return (globalThis as any).pdfMake;
  };

  const onDownload = async () => {
    if (!data) return;
    try {
      const pdfMake = await ensurePdfMake();

    const subjectTableBody: any[] = [];
    subjectTableBody.push([
      { text: "Subject", style: "th", alignment: "left" },
      { text: "TH Total", style: "th", alignment: "right" },
      { text: "PR Total", style: "th", alignment: "right" },
      { text: "Total", style: "th", alignment: "right" },
    ]);
    (data.subjects || []).forEach((s) => {
      subjectTableBody.push([
        { text: s.name },
        { text: num2(s.thTotal), alignment: "right" },
        { text: num2(s.prTotal), alignment: "right" },
        { text: num2(s.total), alignment: "right" },
      ]);
    });
    if (data.subjectTotals) {
      subjectTableBody.push([
        { text: "Grand Total", bold: true, alignment: "right" },
        { text: num2(data.subjectTotals.thTotal), bold: true, alignment: "right" },
        { text: num2(data.subjectTotals.prTotal), bold: true, alignment: "right" },
        { text: num2(data.subjectTotals.total), bold: true, alignment: "right" },
      ]);
    }

    const examsBody: any[] = [];
    examsBody.push([
      { text: "Exam", style: "th", alignment: "left" },
      { text: "Term", style: "th", alignment: "left" },
      { text: "Total", style: "th", alignment: "right" },
      { text: "Percent", style: "th", alignment: "right" },
      { text: "Grade", style: "th", alignment: "left" },
      { text: "Division", style: "th", alignment: "left" },
    ]);
    data.items.forEach((it) => {
      examsBody.push([
        { text: it.examName },
        { text: it.term },
        { text: num2(it.total), alignment: "right" },
        { text: `${num2(it.percentage)}%`, alignment: "right" },
        { text: it.grade },
        { text: it.division },
      ]);
    });
    examsBody.push([
      { text: "Grand Total / Average", bold: true, colSpan: 2 }, {},
      { text: num2(data.grandTotal), alignment: "right", bold: true },
      { text: `${num2(data.avgPercent)}%`, alignment: "right", bold: true },
      { text: "", colSpan: 2 }, {},
    ]);

    console.log('School data in PDF:', data.school); // Debug log
    
    const docDefinition: any = {
      pageSize: "A4",
      pageMargins: [25, 25, 25, 25],
      content: [
        // Title
        { text: 'STUDENT RESULT', fontSize: 16, bold: true, alignment: 'center', color: violet, margin: [0, 20, 0, 20] },
        // Student Details Box
        {
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: 'Student Name:', bold: true, border: [true, true, false, false], fontSize: 10 },
                { text: data.student.name, border: [false, true, false, false], fontSize: 10 },
                { text: 'Roll No:', bold: true, border: [false, true, false, false], fontSize: 10 },
                { text: String(data.student.rollNo), border: [false, true, true, false], fontSize: 10 }
              ],
              [
                { text: 'Student ID:', bold: true, border: [true, false, false, true], fontSize: 10 },
                { text: (data.student as any)?.studentCode ?? '-', border: [false, false, false, true], fontSize: 10 },
                { text: 'Class:', bold: true, border: [false, false, false, true], fontSize: 10 },
                { text: `Class ${data.student.section ? data.student.section : '9'}`, border: [false, false, true, true], fontSize: 10 }
              ]
            ]
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => violet,
            vLineColor: () => violet,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6
          },
          margin: [0, 0, 0, 20]
        },
        { text: "SUBJECT-WISE MARKS", fontSize: 11, bold: true, color: violet, margin: [0, 5, 0, 5] },
        {
          table: { 
            headerRows: 1, 
            widths: ["*", "auto", "auto", "auto"], 
            body: subjectTableBody 
          },
          layout: {
            fillColor: (rowIndex: number, node: any) => {
              if (rowIndex === 0) return violet;
              if (rowIndex === node.table.body.length - 1) return '#F3E5F5';
              return rowIndex % 2 === 0 ? '#FAFAFA' : null;
            },
            hLineColor: () => violet,
            vLineColor: () => violet,
            hLineWidth: (i: number) => (i === 0 || i === 1 ? 2 : 1),
            vLineWidth: () => 1,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
        { text: "TH = Theory, PR = Practical", italics: true, fontSize: 7, color: "#666", margin: [0, 3, 0, 8] },
        { text: "EXAMINATION SUMMARY", fontSize: 11, bold: true, color: violet, margin: [0, 5, 0, 5] },
        {
          table: { 
            headerRows: 1, 
            widths: ["*", "auto", "auto", "auto", "auto", "auto"], 
            body: examsBody 
          },
          layout: {
            fillColor: (rowIndex: number, node: any) => {
              if (rowIndex === 0) return violet;
              if (rowIndex === node.table.body.length - 1) return '#F3E5F5';
              return rowIndex % 2 === 0 ? '#FAFAFA' : null;
            },
            hLineColor: () => violet,
            vLineColor: () => violet,
            hLineWidth: (i: number) => (i === 0 || i === 1 ? 2 : 1),
            vLineWidth: () => 1,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
        // Footer
        {
          text: `Generated on: ${new Date().toLocaleDateString('en-GB')}`,
          fontSize: 9,
          color: '#666',
          alignment: 'center',
          margin: [0, 20, 0, 0]
        }
      ],
      styles: {
        th: { color: "white", bold: true, fontSize: 10 },
        header: { fontSize: 14, bold: true, color: violet },
        subheader: { fontSize: 11, bold: true, color: '#333' }
      },
      defaultStyle: { fontSize: 9 },
    };

    const filename = `Marksheet_${data.student.name.replace(/\s+/g, '_')}.pdf`;
    (globalThis as any).pdfMake.createPdf(docDefinition).download(filename);
    } catch (e: any) {
      console.error("PDF generation failed", e);
      alert(`Unable to generate PDF: ${e?.message || e}`);
    }
  };

  return (
    <div className="space-y-4">
      {!data ? (
        <form onSubmit={onVerify} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-sm">Verify Date of Birth</label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="rounded-md border px-3 py-2 bg-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "View Mark Sheet"}
          </button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-violet-700">Final Marksheet (All Exams)</h3>
            <button onClick={onDownload} className="px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700">Download Marksheet</button>
          </div>
          <div className="text-sm text-neutral-700">
            <span className="font-medium">Student:</span> {data.student?.name} (Roll {data.student?.rollNo}) {" "}
            <span className="text-neutral-500">• ID:</span> {(data.student as any)?.studentCode ?? "-"}
          </div>
          {!!data.subjects?.length && (
            <div>
              <h4 className="text-md font-medium mb-2 text-violet-700">Subject-wise Totals (TH | PR)</h4>
              <div className="overflow-auto rounded-md shadow-sm border border-violet-200/70">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-violet-600 text-white">
                      <th className="text-left px-3 py-2 border-r border-violet-500/60">Subject</th>
                      <th className="text-right px-3 py-2 border-r border-violet-500/60">TH Total</th>
                      <th className="text-right px-3 py-2 border-r border-violet-500/60">PR Total</th>
                      <th className="text-right px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subjects!.map((s, idx) => (
                      <tr key={s.id} className={idx % 2 ? "bg-white" : "bg-violet-50/40"}>
                        <td className="px-3 py-2 border-t border-violet-200/70">{s.name}</td>
                        <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(s.thTotal)}</td>
                        <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(s.prTotal)}</td>
                        <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(s.total)}</td>
                      </tr>
                    ))}
                    {data.subjectTotals && (
                      <tr className="font-semibold bg-violet-50">
                        <td className="px-3 py-2 border-t border-violet-200/70 text-right">Grand Total</td>
                        <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(data.subjectTotals.thTotal)}</td>
                        <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(data.subjectTotals.prTotal)}</td>
                        <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(data.subjectTotals.total)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-neutral-600 mt-1">TH = Theory, PR = Practical</div>
            </div>
          )}
          <div className="overflow-auto rounded-md shadow-sm border border-violet-200/70">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-violet-600 text-white">
                  <th className="text-left px-3 py-2 border-r border-violet-500/60">Exam</th>
                  <th className="text-left px-3 py-2 border-r border-violet-500/60">Term</th>
                  <th className="text-right px-3 py-2 border-r border-violet-500/60">Total</th>
                  <th className="text-right px-3 py-2 border-r border-violet-500/60">Percent</th>
                  <th className="text-left px-3 py-2 border-r border-violet-500/60">Grade</th>
                  <th className="text-left px-3 py-2">Division</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, idx) => (
                  <tr key={it.examId} className={idx % 2 ? "bg-white" : "bg-violet-50/40"}>
                    <td className="px-3 py-2 border-t border-violet-200/70">{it.examName}</td>
                    <td className="px-3 py-2 border-t border-violet-200/70">{it.term}</td>
                    <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(it.total)}</td>
                    <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(it.percentage)}%</td>
                    <td className="px-3 py-2 border-t border-violet-200/70">{it.grade}</td>
                    <td className="px-3 py-2 border-t border-violet-200/70">{it.division}</td>
                  </tr>
                ))}
                <tr className="font-semibold bg-violet-50">
                  <td className="px-3 py-2 border-t border-violet-200/70" colSpan={2}>Grand Total / Average</td>
                  <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(data.grandTotal)}</td>
                  <td className="px-3 py-2 border-t border-violet-200/70 text-right">{num2(data.avgPercent)}%</td>
                  <td className="px-3 py-2 border-t border-violet-200/70" colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
