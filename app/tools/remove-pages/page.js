'use client';
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolWorkspace from '@/components/ToolWorkspace';

export default function RemovePagesPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);
  const [pagesToRemove, setPagesToRemove] = useState('');

  const handleProcess = async (file, toast) => {
    if (!file) return;
    if (!pagesToRemove.trim()) {
      toast.error('Please enter the pages you want to remove (e.g., 1, 3, 5-7)');
      return;
    }

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();

      // Parse pages to remove
      let toRemove = new Set();
      const parts = pagesToRemove.split(',').map(p => p.trim());
      
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (start && end && start <= end) {
            for (let i = start; i <= end; i++) toRemove.add(i);
          }
        } else {
          const num = Number(part);
          if (num) toRemove.add(num);
        }
      }

      // We actually want to KEEP pages that are NOT in the remove list
      let pagesToKeep = [];
      for (let i = 1; i <= totalPages; i++) {
        if (!toRemove.has(i)) pagesToKeep.push(i);
      }

      if (pagesToKeep.length === 0) {
        throw new Error('You cannot remove all pages from the document.');
      }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, pagesToKeep.map(p => p - 1));
      copiedPages.forEach((page) => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultFile({ url, name: `${file.name.replace(/\.[^/.]+$/, '')}_cleaned.pdf` });
      toast.success('Pages removed successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove pages: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const options = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Pages to Remove (e.g. 1, 3, 5-7)</label>
      <input
        type="text"
        className="form-input"
        placeholder="1, 3, 5-7"
        value={pagesToRemove}
        onChange={(e) => setPagesToRemove(e.target.value)}
      />
    </div>
  );

  return (
    <ToolWorkspace
      title="Remove Pages"
      description="Select pages to remove from your PDF document."
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
