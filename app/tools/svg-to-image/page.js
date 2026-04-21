'use client';
import { useState } from 'react';
import ToolWorkspace from '@/components/ToolWorkspace';
import { useToast } from '@/components/Toast';

export default function SvgToImagePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);
  const [format, setFormat] = useState('image/png');
  const toast = useToast();

  const handleProcess = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const text = await file.text();
      
      // We must ensure the SVG has width and height attributes or the canvas won't render it properly
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const svgElement = doc.documentElement;
      
      let width = parseFloat(svgElement.getAttribute('width')) || 800;
      let height = parseFloat(svgElement.getAttribute('height')) || 600;
      
      if (!svgElement.getAttribute('width')) svgElement.setAttribute('width', width);
      if (!svgElement.getAttribute('height')) svgElement.setAttribute('height', height);
      
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width || width;
      canvas.height = img.height || height;
      
      const ctx = canvas.getContext('2d');
      // If converting to JPG, we need a white background (SVGs are transparent)
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL(format, 1.0);
      URL.revokeObjectURL(url);
      
      setResultFile({
        url: dataUrl,
        name: `converted_${Date.now()}.${format === 'image/jpeg' ? 'jpg' : 'png'}`
      });
      toast.success('SVG converted successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert SVG: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const options = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Output Format</label>
      <select 
        className="form-input" 
        value={format} 
        onChange={e => setFormat(e.target.value)}
      >
        <option value="image/png">PNG (Transparent)</option>
        <option value="image/jpeg">JPG (White Background)</option>
      </select>
    </div>
  );

  return (
    <ToolWorkspace
      title="SVG to Image"
      description="Convert vector SVG files into standard JPG or PNG images directly in your browser."
      accept=".svg, image/svg+xml"
      multiple={false}
      onProcess={handleProcess}
      optionsComponent={options}
      isProcessing={isProcessing}
      resultFile={resultFile}
      onReset={() => setResultFile(null)}
    />
  );
}
