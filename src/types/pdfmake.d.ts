declare module 'pdfmake/build/pdfmake' {
  interface PdfMake {
    vfs: Record<string, string>;
    createPdf(docDefinition: unknown): {
      getBlob(callback: (blob: Blob) => void): void;
    };
  }
  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfsFonts: {
    pdfMake: {
      vfs: Record<string, string>;
    };
  };
  export default vfsFonts;
}

declare module 'pdfmake/build/pdfmake.min.js' {
  interface PdfMake {
    vfs: Record<string, string>;
    createPdf(docDefinition: unknown): {
      getBlob(callback: (blob: Blob) => void): void;
    };
  }
  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts.js' {
  const vfsFonts: {
    pdfMake: {
      vfs: Record<string, string>;
    };
  };
  export default vfsFonts;
}
