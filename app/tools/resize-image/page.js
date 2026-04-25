'use client';
import { useState } from 'react';
import ToolWorkspace from '@/components/ToolWorkspace';

export default function ResizeImagePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  const handleProcess = async (file, toast) => {
    if (!file) return;
    if (!width && !height) {
      toast.error('Please enter at least one dimension (width or height).');
      return;
    }

    setIsProcessing(true);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const originalWidth = img.width;
      const originalHeight = img.height;
      const ratio = originalWidth / originalHeight;

      let targetWidth = parseInt(width);
      let targetHeight = parseInt(height);

      if (targetWidth && !targetHeight) {
        targetHeight = Math.round(targetWidth / ratio);
      } else if (targetHeight && !targetWidth) {
        targetWidth = Math.round(targetHeight * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Preserve original format, default to high quality for JPEG
      const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(format, 0.95);
      
      URL.revokeObjectURL(url);
      
      setResultFile({
        url: dataUrl,
        name: `${file.name.replace(/\.[^/.]+$/, '')}_resized.${format === 'image/png' ? 'png' : 'jpg'}`
      });
      toast.success('Image resized successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to resize image: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const options = (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Width (px)</label>
        <input
          type="number"
          className="form-input"
          placeholder="e.g. 800"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Height (px)</label>
        <input
          type="number"
          className="form-input"
          placeholder="e.g. 600"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <ToolWorkspace
      title="Resize Image"
      description="Change the dimensions of your image. Leave one field blank to preserve aspect ratio."
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
