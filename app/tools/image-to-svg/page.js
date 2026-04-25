'use client';
import { useState } from 'react';
import ToolWorkspace from '@/components/ToolWorkspace';

export default function ImageToSvgPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultFile, setResultFile] = useState(null);

  const handleProcess = async (file, toast) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/tools/image-to-svg', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = 'Server error';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (_) {
          errorMsg = `Server error (${response.status})`;
        }
        throw new Error(errorMsg);
      }

      const svgBlob = await response.blob();
      const url = URL.createObjectURL(svgBlob);
      
      setResultFile({
        url,
        name: `${file.name.replace(/\.[^/.]+$/, '')}_traced.svg`
      });
      toast.success('Image traced to SVG successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to trace image: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolWorkspace
      title="Image to SVG"
      description="Convert raster images (JPG, PNG) into vector SVG format using Potrace."
      accept="image/jpeg, image/png, image/webp"
      multiple={false}
      onProcess={handleProcess}
      isProcessing={isProcessing}
      resultFile={resultFile}
      onReset={() => setResultFile(null)}
    />
  );
}
