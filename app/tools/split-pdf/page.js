'use client';
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolWorkspace from '@/components/ToolWorkspace';

export default function SplitPdfPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);
  const [pageRange, setPageRange] = useState('');

  const handleProcess = async (file, toast) => {
    if (!file) {
      toast.error('Please select a PDF file.');
      return;
    }

    if (!pageRange.trim()) {
      toast.error('Please enter a page range (e.g., 1-5 or 1,3,4)');
      return;
    }

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();

      // Parse page range (e.g., "1-3, 5")
      let pagesToExtract = new Set();
      const parts = pageRange.split(',').map(p => p.trim());
      
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (start && end && start <= end) {
            for (let i = start; i <= end; i++) pagesToExtract.add(i);
          }
        } else {
          const num = Number(part);
          if (num) pagesToExtract.add(num);
        }
      }

      const pagesArray = Array.from(pagesToExtract).filter(p => p >= 1 && p <= totalPages);
      
      if (pagesArray.length === 0) {
        throw new Error('No valid pages found in range.');
      }

      const newPdf = await PDFDocument.create();
      // pdf-lib uses 0-indexed page numbers
      const copiedPages = await newPdf.copyPages(pdf, pagesArray.map(p => p - 1));
      copiedPages.forEach((page) => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultFile({
        url,
        name: `${file.name.replace(/\.[^/.]+$/, '')}.pdf`
      });
      toast.success('PDF split successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to split PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const options = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Pages to Extract (e.g. 1-3, 5)</label>
      <input
        type="text"
        className="form-input"
        placeholder="1-3, 5"
        value={pageRange}
        onChange={(e) => setPageRange(e.target.value)}
      />
    </div>
  );

  return (
    <ToolWorkspace
      title="Split PDF"
      description="Extract specific pages from your PDF file."
      accept="application/pdf"
      multiple={false}
      onProcess={handleProcess}
      optionsComponent={options}
      isProcessing={isProcessing}
      resultFile={resultFile}
      onReset={() => setResultFile(null)}
    />
  );
}
