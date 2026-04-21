'use client';
import { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolWorkspace from '@/components/ToolWorkspace';
import { useToast } from '@/components/Toast';

export default function RotatePdfPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);
  const [rotation, setRotation] = useState(90);
  const toast = useToast();

  const handleProcess = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();

      pages.forEach(page => {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotation));
      });

      const newPdfBytes = await pdf.save();
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultFile({ url, name: `rotated_${Date.now()}.pdf` });
      toast.success('PDF rotated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to rotate PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const options = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Rotation Angle</label>
      <select 
        className="form-input" 
        value={rotation} 
        onChange={e => setRotation(Number(e.target.value))}
      >
        <option value={90}>90° Clockwise</option>
        <option value={-90}>90° Counter-Clockwise</option>
        <option value={180}>180°</option>
      </select>
    </div>
  );

  return (
    <ToolWorkspace
      title="Rotate PDF"
      description="Rotate all pages in your PDF document."
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
