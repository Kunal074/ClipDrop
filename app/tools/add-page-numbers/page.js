'use client';
import { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import ToolWorkspace from '@/components/ToolWorkspace';

export default function AddPageNumbersPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);

  const handleProcess = async (file, toast) => {
    if (!file) return;
    
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width } = page.getSize();
        
        const text = `Page ${i + 1} of ${totalPages}`;
        const fontSize = 12;
        // Approximate width of text to center it
        const textWidth = text.length * (fontSize * 0.5);
        
        page.drawText(text, {
          x: (width / 2) - (textWidth / 2),
          y: 20, // 20 units from the bottom
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultFile({
        url,
        name: `${file.name.replace(/\.[^/.]+$/, "")}.pdf`
      });
      toast.success('Page numbers added successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add page numbers: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolWorkspace
      title="Add Page Numbers to PDF"
      description="Automatically insert page numbers at the bottom of every page in your PDF."
      accept="application/pdf"
      multiple={false}
      onProcess={handleProcess}
      isProcessing={isProcessing}
      resultFile={resultFile}
      onReset={() => setResultFile(null)}
    />
  );
}
