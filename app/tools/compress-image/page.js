'use client';
import { useState } from 'react';
import ToolWorkspace from '@/components/ToolWorkspace';
import { useToast } from '@/components/Toast';

export default function CompressImagePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);
  const [quality, setQuality] = useState(0.6);
  const [format, setFormat] = useState('image/jpeg');
  const toast = useToast();

  const handleProcess = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      // Fill white background in case it's a transparent PNG being saved as JPG
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL(format, Number(quality));
      URL.revokeObjectURL(url);
      
      setResultFile({
        url: dataUrl,
        name: `compressed_${Date.now()}.${format === 'image/webp' ? 'webp' : 'jpg'}`
      });
      toast.success('Image compressed successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to compress image: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const options = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Compression Level: {Math.round((1 - quality) * 100)}%</label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.1"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-3)' }}>
          <span>Max Compression</span>
          <span>Best Quality</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Output Format</label>
        <select 
          className="form-input" 
          value={format} 
          onChange={e => setFormat(e.target.value)}
        >
          <option value="image/jpeg">JPEG (Standard)</option>
          <option value="image/webp">WEBP (Best compression)</option>
        </select>
      </div>
    </div>
  );

  return (
    <ToolWorkspace
      title="Compress Image"
      description="Reduce image file size with minimal quality loss."
      accept="image/jpeg, image/png, image/webp"
      multiple={false}
      onProcess={handleProcess}
      optionsComponent={options}
      isProcessing={isProcessing}
      resultFile={resultFile}
      onReset={() => setResultFile(null)}
    />
  );
}
