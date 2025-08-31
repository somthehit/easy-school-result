"use client";

import React from "react";
import pdfMake from "pdfmake/build/pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";

// Initialize pdfmake vfs for browser usage
// @ts-ignore
const __vfs = (vfsFonts as any)?.pdfMake?.vfs || (vfsFonts as any)?.vfs;
if (__vfs) {
  // @ts-ignore
  pdfMake.vfs = __vfs;
}

function toDataURL(url?: string | null): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function StudentCertificateClient({
  data,
}: {
  data: {
    schoolLogoUrl?: string | null;
    schoolName?: string | null;
    studentName: string;
    parentName?: string | null;
    gender?: "male" | "female" | "other" | null;
    dob?: string | Date | null;
    joiningDate?: string | Date | null;
    className?: string | null;
    title?: string; // e.g., CERTIFICATE
    subtitle?: string; // e.g., OF APPRECIATION
    presentedPrefix?: string; // e.g., THIS CERTIFICATE IS PRESENTED TO
    bodyText?: string; // long paragraph
    dateText?: string; // e.g., On October 6, 2025
    signerName?: string; // e.g., Principal Name
    signerTitle?: string; // e.g., Principal
  };
}) {
  async function buildDocDef() {
    const bg = await toDataURL("/ID Card/certificate.svg");
    const logo = await toDataURL(data.schoolLogoUrl || undefined);

    const content: any[] = [];
    if (bg) {
      // Full-page background
      content.push({ image: bg, absolutePosition: { x: 0, y: 0 }, width: 842 }); // A4 landscape width
    }

    // Top-left logo + school name
    content.push({
      columns: [
        logo ? { width: 60, image: logo, fit: [60, 60] } : { width: 60, text: "" },
        { width: "*", text: data.schoolName || "", color: "#0f2c52", bold: true, fontSize: 14, margin: [8, 14, 0, 0] },
      ],
      margin: [40, 40, 40, 0],
    });

    // Main headings
    content.push({ text: data.title || "CERTIFICATE", alignment: "center", color: "#1f4a7a", bold: true, fontSize: 48, margin: [0, 16, 0, 0], characterSpacing: 2 });
    content.push({ text: data.subtitle || "OF APPRECIATION", alignment: "center", color: "#2e5f93", bold: true, fontSize: 20, margin: [0, 4, 0, 18], characterSpacing: 3 });

    // Presented to line
    content.push({ text: (data.presentedPrefix || "THIS CERTIFICATE IS PRESENTED TO").toUpperCase(), alignment: "center", color: "#1a4a7a", bold: true, fontSize: 14, margin: [0, 4, 0, 10], characterSpacing: 2 });

    // Recipient name in script-like style (approx)
    content.push({ text: data.studentName, alignment: "center", color: "#d1a347", bold: true, fontSize: 42, margin: [0, 0, 0, 4] });
    // Golden line under name
    content.push({ canvas: [ { type: 'line', x1: 220, y1: 0, x2: 622, y2: 0, lineWidth: 2, lineColor: '#d1a347' } ], margin: [0, 0, 0, 16] });

    // Body paragraph (auto-composed if not provided)
    const autoBody = buildBody();
    content.push({
      alignment: "center",
      margin: [80, 0, 80, 40],
      color: "#334155",
      lineHeight: 1.4,
      text: data.bodyText || autoBody,
    });

    // Signature and footer
    content.push({
      columns: [
        { width: "*", text: "", margin: [0,0,0,0] },
        { width: 220, stack: [
          { canvas: [ { type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1.5, lineColor: '#1f4a7a' } ], margin: [0, 30, 0, 4] },
          { text: data.signerName || "", alignment: 'center', color: '#1f4a7a', bold: true },
          { text: data.signerTitle || "", alignment: 'center', color: '#1f4a7a' },
        ]},
        { width: "*", text: "", margin: [0,0,0,0] },
      ],
      margin: [60, 0, 60, 0],
    });

    // Date centered near bottom
    if (data.dateText) {
      content.push({ text: data.dateText, alignment: 'center', color: '#1f4a7a', margin: [0, 12, 0, 0] });
    }

    const dd: any = {
      pageSize: "A4",
      pageOrientation: "landscape",
      pageMargins: [0, 0, 0, 40],
      content,
      defaultStyle: {
        fontSize: 12,
      },
    };

    return dd;
  }

  function buildBody() {
    const name = data.studentName;
    const parent = data.parentName || "";
    const gender = (data.gender || "").toLowerCase();
    const sonDaughter = gender === "male" ? "son" : gender === "female" ? "daughter" : "son/daughter";
    const heShe = gender === "male" ? "He" : gender === "female" ? "She" : "He/She";
    const himHer = gender === "male" ? "him" : gender === "female" ? "her" : "him/her";
    const dob = fmtDate(data.dob);
    const join = fmtDate(data.joiningDate);
    const cls = data.className || "the prescribed class";

    const p1 = `This is to certify that ${name}, ${sonDaughter} of ${parent}, born on ${dob || "[Date of Birth]"}, has been studying in this school since ${join || "[Date of Joining]"}. ${heShe} has successfully completed ${cls}.`;
    const p2 = `We have found ${himHer} to be disciplined, hardworking, and sincere. We wish ${himHer} every success in all future endeavors.`;
    return p1 + "\n\n" + p2;
  }

  function fmtDate(d?: string | Date | null) {
    if (!d) return "";
    try {
      const date = typeof d === "string" ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return ""; }
  }

  function onPrint() {
    buildDocDef().then((dd) => pdfMake.createPdf(dd).print());
  }
  function onExport() {
    buildDocDef().then((dd) => pdfMake.createPdf(dd).download(`${data.studentName}-Certificate.pdf`));
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrint} className="px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900">Print Certificate</button>
      <button onClick={onExport} className="px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900">Export Certificate</button>
    </div>
  );
}
