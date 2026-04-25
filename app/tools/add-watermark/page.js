'use client';
import { useState } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import ToolWorkspace from '@/components/ToolWorkspace';

export default function AddWatermarkPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');

  const handleProcess = async (file, toast) => {
    if (!file) return;
    if (!watermarkText.trim()) {
      toast.error('Please enter the watermark text.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        // Calculate a reasonable font size based on page width
        const fontSize = Math.min(width, height) / 10;
        
        page.drawText(watermarkText, {
          x: width / 2 - (watermarkText.length * fontSize * 0.3), // Rough centering
          y: height / 2,
          size: fontSize,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.3,
          rotate: degrees(45),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultFile({
        url,
        name: `${file.name.replace(/\.[^/.]+$/, "")}.pdf`
      });
      toast.success('Watermark added successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add watermark: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const OptionsComponent = (
    <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-2)' }}>Watermark Text:</label>
      <input
        type="text"
        className="form-input"
        value={watermarkText}
        onChange={(e) => setWatermarkText(e.target.value)}
        placeholder="e.g. CONFIDENTIAL or DRAFT"
        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}
      />
    </div>
  );

  return (
    <ToolWorkspace
      title="Add Watermark to PDF"
      description="Stamp text over your PDF pages to secure your documents."
      accept="application/pdf"
      multiple={false}
      onProcess={handleProcess}
      optionsComponent={OptionsComponent}
      isProcessing={isProcessing}
      resultFile={resultFile}
      onReset={() => setResultFile(null)}
    />
  );
}
