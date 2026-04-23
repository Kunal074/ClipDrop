'use client';
import { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';

export function ToolWorkspaceContent({ title, description, accept, multiple = false, onProcess, optionsComponent, isProcessing, resultFile, onReset }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  // Track tool usage for admin analytics
  useEffect(() => {
    if (!title) return;
    const toolName = title.toLowerCase().replace(/\s+/g, '-');
    fetch('/api/track/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName }),
    }).catch(() => {}); // Silent fail — tracking is non-critical
  }, [title]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles(multiple ? [...files, ...droppedFiles] : [droppedFiles[0]]);
    }
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setFiles(multiple ? [...files, ...selectedFiles] : [selectedFiles[0]]);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="home-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', flex: 1, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{title}</h1>
          <p style={{ color: 'var(--text-2)' }}>{description}</p>
        </div>

        {resultFile ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ marginBottom: '1rem' }}>Processing Complete!</h2>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <a
                href={resultFile.url}
                download={resultFile.name}
                className="btn btn-primary"
              >
                📥 Download File
              </a>
              <button onClick={() => { setFiles([]); onReset(); }} className="btn btn-secondary">
                Process Another
              </button>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div
            className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer' }}
          >
            <input
              type="file"
              accept={accept}
              multiple={multiple}
              ref={fileInputRef}
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                <h3 style={{ marginBottom: '0.5rem' }}>Select file{multiple ? 's' : ''} or drag and drop here</h3>
                <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Accepts {accept}</p>
              </div>
            ) : (
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Selected File{files.length > 1 ? 's' : ''}</h3>
                    {multiple && (
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="btn btn-secondary btn-sm"
                        disabled={isProcessing}
                      >
                        + Add More
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ fontSize: '1.5rem' }}>📄</div>
                          <div>
                            <div style={{ margin: 0, wordBreak: 'break-all', fontSize: '0.95rem' }}>{f.name}</div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{formatSize(f.size)}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setFiles(files.filter((_, index) => index !== i))} 
                          className="btn btn-ghost btn-sm"
                          disabled={isProcessing}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {optionsComponent && (
              <div style={{ marginBottom: '1.5rem' }}>
                {optionsComponent}
              </div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={() => onProcess(multiple ? files : files[0], toast)}
              disabled={isProcessing || files.length === 0}
            >
              {isProcessing ? <><span className="spinner" /> Processing...</> : 'Start Processing'}
            </button>
          </div>
        )}
      </main>
      <ToastContainer />
    </div>
  );
}

export default function ToolWorkspace(props) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ToolWorkspaceContent {...props} />
      </ToastProvider>
    </AuthProvider>
  );
}
