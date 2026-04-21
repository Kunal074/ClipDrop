'use client';
import { useState } from 'react';
import ToolWorkspace from '@/components/ToolWorkspace';

export default function OfficeToPdfPage({ title, description, accept }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);

  const handleProcess = async (file, toast) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tools/office-to-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }

      const pdfBlob = await response.blob();
      const url = URL.createObjectURL(pdfBlob);
      
      setResultFile({
        url,
        name: `${file.name.replace(/\.[^/.]+$/, "")}_converted.pdf`
      });
      toast.success('Document converted to PDF successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolWorkspace
      title={title}
      description={description}
      accept={accept}
      multiple={false}
      onProcess={handleProcess}
      isProcessing={isProcessing}
      resultFile={resultFile}
      onReset={() => setResultFile(null)}
    />
  );
}
