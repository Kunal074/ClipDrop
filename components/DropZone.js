'use client';
import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

const MAX_SIZE = 1024 * 1024 * 1024; // 1 GB

const DropZone = forwardRef(({ onUploadComplete, roomCode, getToken }, ref) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [requireGoogle, setRequireGoogle] = useState(false);
  const fileInputRef = useRef(null);

  const uploadFile = useCallback(async (file) => {
    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum is 1 GB.');
      return;
    }

    setError('');
    setRequireGoogle(false);
    setUploading(true);
    setProgress(0);

    try {
      const token = getToken ? getToken() : null;
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
        const rawText = await presignRes.text();
        console.error('[DropZone] Presign failed:', presignRes.status, rawText);
        let err;
        try { err = JSON.parse(rawText); } catch { err = { error: rawText }; }
        if (err.requireGoogleAuth) {
           setRequireGoogle(true);
           setUploading(false);
           return;
        }
        throw new Error(`[${presignRes.status}] ${err.error || rawText}`);
      }

      const { presignedUrl, isGoogleDrive } = await presignRes.json();

      // Step 2: Upload directly to Google Drive Session URL
      const xhrResponseText = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
          else reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText || 'Unknown error'}`));
        };

        xhr.onerror = () => reject(new Error('Upload failed (Network/CORS error)'));
        xhr.send(file);
      });

      let finalPublicUrl = '';
      let finalFileKey = '';
      
      // Step 3: Finalize Drive File
      if (isGoogleDrive) {
        let fileId = '';
        try {
          const resObj = JSON.parse(xhrResponseText);
          fileId = resObj.id;
        } catch (e) {
          throw new Error('Failed to parse Drive response');
        }

        const finalizeRes = await fetch('/api/upload/finalize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ fileId })
        });

        if (!finalizeRes.ok) {
          const finalizeText = await finalizeRes.text();
          console.error('[DropZone] Finalize failed:', finalizeRes.status, finalizeText);
          throw new Error(`Finalize [${finalizeRes.status}]: ${finalizeText}`);
        }
        const finalized = await finalizeRes.json();
        finalPublicUrl = finalized.publicUrl;
        finalFileKey = fileId; // Store drive ID as key for later deletion
      }

      setProgress(100);

      // Step 4: Notify parent
      const isImage = file.type.startsWith('image/');
      onUploadComplete({
        type: isImage ? 'image' : 'file',
        content: finalPublicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileKey: finalFileKey,
        mimeType: file.type || 'application/octet-stream',
        isLargeFile: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1500);
    }
  }, [onUploadComplete, getToken]);

  useImperativeHandle(ref, () => ({
    uploadFile
  }));

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);

    // Prevent folder drops
    if (e.dataTransfer.items && e.dataTransfer.items[0]) {
      const item = e.dataTransfer.items[0];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry && entry.isDirectory) {
          setError('Folders are not supported. Please zip the folder first or drop individual files.');
          return;
        }
      }
    }

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
      onClick={() => !uploading && !requireGoogle && fileInputRef.current?.click()}
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

      {requireGoogle ? (
        <div className="dropzone__google-connect" style={{ textAlign: 'center', padding: '1rem' }}>
          <p className="dropzone__label" style={{ marginBottom: '1rem' }}>
            Large files are stored securely in your personal Google Drive.
          </p>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/api/auth/google/connect?token=${encodeURIComponent(localStorage.getItem('clipdrop_token') || '')}`;
            }} 
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            Connect Google Drive
          </button>
          <p 
            className="dropzone__sublabel" 
            style={{ marginTop: '1rem', cursor: 'pointer' }} 
            onClick={(e) => { e.stopPropagation(); setRequireGoogle(false); }}
          >
            Cancel
          </p>
        </div>
      ) : uploading ? (
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
          <p className="dropzone__sublabel">Up to 1 GB · Stored in Google Drive</p>
        </>
      )}

      {error && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.5)',
          borderRadius: '8px',
          fontSize: '0.78rem',
          color: '#ff6b6b',
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
});

export default DropZone;
