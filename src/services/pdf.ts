import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

type MarkRow = {
  subject: string;
  obtained: number;
  converted: number;
  fullMark: number;
};

type MarksheetData = {
  schoolName: string;
  className: string;
  section: string;
  studentName: string;
  rollNo: number | string;
  examName: string;
  total: number;
  percentage: number;
  grade: string;
  division: string;
  rows: MarkRow[];
};

export async function buildMarksheetPdf(data: MarksheetData): Promise<Blob> {
  const docDef: any = {
    content: [
      { text: data.schoolName, style: "title" },
      { text: `${data.className} - Section ${data.section}`, margin: [0, 0, 0, 8] },
      { text: `Student: ${data.studentName} (Roll: ${data.rollNo})` },
      { text: `Exam: ${data.examName}`, margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 60, 60, 60],
          body: [
            ["Subject", "Obtained", "Converted", "Full"],
            ...data.rows.map((r) => [r.subject, r.obtained.toFixed(2), r.converted.toFixed(2), r.fullMark]),
          ],
        },
      },
      {
        columns: [
          { text: `Total: ${data.total.toFixed(2)}` },
          { text: `Percentage: ${data.percentage.toFixed(2)}%` },
          { text: `Grade: ${data.grade}` },
          { text: `Division: ${data.division}` },
        ],
        margin: [0, 8, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 18, bold: true, alignment: "center", margin: [0, 0, 0, 12] },
    },
    defaultStyle: { fontSize: 10 },
  };

  return new Promise((resolve) => {
    const pdfDocGenerator = pdfMake.createPdf(docDef);
    pdfDocGenerator.getBlob((blob: Blob) => resolve(blob));
  });
}

// Optional class result table
export async function buildClassResultPdf(opts: {
  schoolName: string;
  className: string;
  section: string;
  examName: string;
  headers: string[]; // e.g., ["Roll", "Name", "Total", "Percent", "Grade", "Rank"]
  rows: (string | number)[][];
}): Promise<Blob> {
  const { schoolName, className, section, examName, headers, rows } = opts;
  const docDef: any = {
    content: [
      { text: schoolName, style: "title" },
      { text: `${className} - Section ${section}` },
      { text: `Exam: ${examName}`, margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths: headers.map(() => "*"),
          body: [headers, ...rows],
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: { title: { fontSize: 18, bold: true, alignment: "center", margin: [0, 0, 0, 12] } },
    defaultStyle: { fontSize: 9 },
  };

  return new Promise((resolve) => {
    const pdfDocGenerator = pdfMake.createPdf(docDef);
    pdfDocGenerator.getBlob((blob: Blob) => resolve(blob));
  });
}
