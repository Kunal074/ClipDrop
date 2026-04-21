'use client';
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolWorkspace from '@/components/ToolWorkspace';

export default function JpgToPdfPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);

  const handleProcess = async (file, toast) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const imageBytes = await file.arrayBuffer();
      const image = await pdfDoc.embedJpg(imageBytes);
      
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultFile({
        url,
        name: `converted_${Date.now()}.pdf`
      });
      toast.success('JPG converted to PDF successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert JPG to PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolWorkspace
      title="JPG to PDF"
      description="Convert JPG images to PDF in seconds, directly in your browser."
      accept="image/jpeg"
      multiple={false}
      onProcess={handleProcess}
      isProcessing={isProcessing}
      resultFile={resultFile}
      onReset={() => setResultFile(null)}
    />
  );
}
