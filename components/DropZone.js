'use client';
import { useState, useRef, useCallback } from 'react';

const MAX_SIZE = 1024 * 1024 * 1024; // 1 GB

export default function DropZone({ onUploadComplete, roomCode, token }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const uploadFile = useCallback(async (file) => {
    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum is 1 GB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Get presigned URL
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || 'application/octet-stream',
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }

      const { presignedUrl, key, publicUrl } = await presignRes.json();

      // Step 2: Upload directly to R2 with progress tracking
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      setProgress(100);

      // Step 3: Notify parent
      const isImage = file.type.startsWith('image/');
      onUploadComplete({
        type: isImage ? 'image' : 'file',
        content: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileKey: key,
        mimeType: file.type || 'application/octet-stream',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1500);
    }
  }, [onUploadComplete, token]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone--active' : ''} ${uploading ? 'dropzone--uploading' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      id="dropzone"
      onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileInput}
        id="file-input"
      />

      {uploading ? (
        <div className="dropzone__progress">
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="dropzone__label">{progress}% uploaded...</p>
        </div>
      ) : (
        <>
          <div className="dropzone__icon">{dragging ? '📥' : '📤'}</div>
          <p className="dropzone__label">
            {dragging ? 'Drop to upload' : 'Drop a file or click to browse'}
          </p>
          <p className="dropzone__sublabel">Up to 1 GB · Large files expire in 30 min</p>
        </>
      )}

      {error && <p className="dropzone__error">{error}</p>}
    </div>
  );
}
