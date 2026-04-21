'use client';
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolWorkspace from '@/components/ToolWorkspace';

export default function MergePdfPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);

  const handleProcess = async (files, toast) => {
    if (!files || files.length < 2) {
      toast.error('Please select at least 2 PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    try {
      // Create a new empty PDF
      const mergedPdf = await PDFDocument.create();

      // Loop through all uploaded files
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // Save the merged PDF
      const mergedPdfBytes = await mergedPdf.save();
      
      // Create a Blob and a URL for downloading
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultFile({
        url,
        name: `merged_${Date.now()}.pdf`
      });
      toast.success('PDFs merged successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to merge PDFs. ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolWorkspace
      title="Merge PDF"
      description="Combine multiple PDFs into a single document entirely in your browser."
      accept="application/pdf"
      multiple={true}
      onProcess={handleProcess}
      isProcessing={isProcessing}
      resultFile={resultFile}
      onReset={() => setResultFile(null)}
    />
  );
}
