"use client";

import React, { useMemo } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";

// Initialize pdfmake vfs for browser usage
// @ts-ignore
const __vfs = (vfsFonts as any)?.pdfMake?.vfs || (vfsFonts as any)?.vfs;
if (__vfs) {
  // @ts-ignore
  pdfMake.vfs = __vfs;
}

export default function StudentIdCardClient({
  student,
  school,
}: {
  student: {
    name: string;
    studentCode?: string | null;
    className?: string | null;
    parentName?: string | null;
    address?: string | null;
    contact?: string | null;
    photoUrl?: string | null;
    validText?: string | null; // e.g., Valid Till: 2079/80 or 2025
  };
  school: {
    name?: string | null;
    address?: string | null;
    estb?: string | null;
    logoUrl?: string | null; // optional
  };
}) {
  const topLine = useMemo(() => {
    const parts: string[] = [];
    if (school.address && school.address.trim()) parts.push(school.address.trim());
    if (school.estb && String(school.estb).trim()) parts.push(`estd: ${String(school.estb).trim()}`);
    return parts.join("  •  ");
  }, [school.address, school.estb]);

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

  async function barcodeDataURL(value?: string | null): Promise<string | null> {
    if (!value) return null;
    try {
      // Lazy import to avoid SSR issues; will work in client only
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- optional dependency, types may not exist until installed
      const JsBarcode = (await import('jsbarcode')).default as any;
      const canvas = document.createElement('canvas');
      // Render Code128 barcode
      JsBarcode(canvas, value, {
        format: 'CODE128',
        lineColor: '#0b4b4f',
        width: 2,
        height: 50,
        displayValue: false,
        margin: 0,
      });
      return canvas.toDataURL('image/png');
    } catch (e) {
      // jsbarcode might not be installed yet; fail gracefully
      return null;
    }
  }

  async function buildDocDef() {
    // Palette approximating the mock
    const primary = "#155e63"; // dark teal
    const accent = "#23e0c0"; // mint

    const photoDataUrl = await toDataURL(student.photoUrl || undefined);
    const logoDataUrl = await toDataURL(school.logoUrl || undefined);
    // Provided decorative assets
    const topWave = await toDataURL("/ID Card/1.svg");
    const bottomWave = await toDataURL("/ID Card/2.svg");

    const headerStack: any[] = [
      {
        columns: [
          logoDataUrl
            ? { width: 28, image: logoDataUrl, fit: [28, 28], margin: [0, 2, 8, 0] }
            : { width: 28, text: "", margin: [0, 0, 8, 0] },
          { width: "*", stack: [
            { text: (school.name || "SCHOOL NAME").toUpperCase(), bold: true, fontSize: 16, color: "#ffffff", characterSpacing: 0.5 },
            ...(topLine ? [{ text: topLine, color: "#d1d5db", fontSize: 9 }] : []),
          ]},
        ],
        margin: [24, 14, 24, 10],
      },
    ];

    const fieldsLeft: any[] = [
      { text: "STUDENT ID CARD", color: "#175d60", bold: true, fontSize: 22, margin: [0,0,0,10] },
      field("Student's Name", student.name),
      field("Student ID", student.studentCode ?? "-"),
      field("Grade/Class", student.className ?? "-"),
      field("Parent's Name", student.parentName ?? "-"),
      field("Address", student.address ?? "-"),
      field("Contact", student.contact ?? "-"),
      field("Valid", student.validText ?? "-"),
    ];

    const photoW = 170, photoH = 210;
    const photoBox: any = photoDataUrl
      ? { image: photoDataUrl, fit: [photoW, photoH], margin: [0, 0, 0, 6] }
      : { canvas: [{ type: 'rect', x: 0, y: 0, w: photoW, h: photoH, lineWidth: 1, lineColor: '#9ca3af' }], margin: [0, 0, 0, 6] };

    // Generate Code128 barcode (placed under the 'Valid' row area)
    const code = student.studentCode || student.name;
    const barcodeUrl = await barcodeDataURL(code);
    const codeBlock: any = barcodeUrl
      ? { image: barcodeUrl, width: 260, height: 50, margin: [photoW + 16 + 24, 8, 0, 0] }
      : {};

    const content: any[] = [
      // Top decorative wave (absolute)
      ...(topWave ? [{ image: topWave, absolutePosition: { x: 0, y: 0 }, width: 540 }] : []),
      ...headerStack,
      {
        columns: [
          { width: photoW + 16, stack: [rounded(photoBox, "#2bb89f", 14)] },
          { width: '*', stack: fieldsLeft, margin: [24, 8, 0, 0] },
        ],
        margin: [32, 16, 24, 0],
      },
      codeBlock,
      // Bottom decorative wave (absolute)
      ...(bottomWave ? [{ image: bottomWave, absolutePosition: { x: 0, y: 270 }, width: 540 }] : []),
    ];

    const dd: any = {
      pageSize: { width: 540, height: 340 }, // landscape card
      pageMargins: [0, 0, 0, 0],
      content,
      styles: {
        label: { color: '#0d3e41', bold: true, fontSize: 11 },
        value: { color: '#0f172a', fontSize: 11 },
      },
    };

    return dd;

    function field(label: string, value: string | number | null) {
      return {
        columns: [
          { width: 140, text: label, style: 'label' },
          { width: '*', text: value == null ? '-' : String(value), style: 'value' },
        ],
        margin: [0, 3, 0, 3],
      } as any;
    }

    function rounded(stackItem: any, borderColor = '#0f766e', r = 12) {
      return {
        stack: [stackItem],
        margin: [0, 0, 0, 0],
        canvas: [
          { type: 'rect', x: -6, y: -6, w: photoW + 12, h: photoH + 12, r, lineColor: borderColor, lineWidth: 2 },
        ],
      } as any;
    }
  }

  function onPrint() {
    buildDocDef().then((dd) => pdfMake.createPdf(dd).print());
  }
  function onExport() {
    buildDocDef().then((dd) => pdfMake.createPdf(dd).download(`${student.name}-ID-Card.pdf`));
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrint} className="px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900">Print ID Card</button>
      <button onClick={onExport} className="px-3 py-1.5 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900">Export ID Card</button>
    </div>
  );
}
