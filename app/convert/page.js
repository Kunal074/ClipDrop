'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer, useToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';

const TOOLS = [
  {
    id: 'image-to-pdf',
    icon: '🖼️',
    title: 'Image → PDF',
    desc: 'Convert JPG, PNG, WEBP images into a single PDF',
    accept: 'image/*',
    multiple: true,
    color: '#6366f1',
  },
  {
    id: 'merge-pdf',
    icon: '📎',
    title: 'Merge PDFs',
    desc: 'Combine multiple PDF files into one document',
    accept: '.pdf',
    multiple: true,
    color: '#0ea5e9',
  },
  {
    id: 'compress-pdf',
    icon: '🗜️',
    title: 'Compress PDF',
    desc: 'Reduce PDF file size by removing redundant data',
    accept: '.pdf',
    multiple: false,
    color: '#f59e0b',
  },
  {
    id: 'office-to-pdf',
    icon: '📄',
    title: 'Office → PDF',
    desc: 'Convert Word, Excel, PowerPoint files to PDF',
    accept: '.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.csv,.txt',
    multiple: false,
    color: '#10b981',
    requiresLibreOffice: true,
  },
];

function ConvertTool({ tool, token }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const toast = useToast();

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles);
    setFiles(tool.multiple ? arr : [arr[0]]);
    setError('');
    setResult(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const convert = async () => {
    if (!files.length) return;
    setConverting(true);
    setError('');
    setResult(null);
    setProgress('Preparing files...');

    try {
      const formData = new FormData();
      formData.append('action', tool.id);
      files.forEach(f => formData.append('files', f));

      setProgress('Converting...');
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.installUrl) {
          throw new Error(`LibreOffice not installed. Download from: ${err.installUrl}`);
        }
        throw new Error(err.error || 'Conversion failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get('Content-Disposition') || '';
      const nameMatch = disposition.match(/filename="?([^"]+)"?/);
      const fileName = nameMatch ? nameMatch[1] : 'converted.pdf';

      setResult({ url, fileName, size: blob.size });
      setProgress('');
      toast.success('Conversion complete!');
    } catch (err) {
      setError(err.message);
    } finally {
      setConverting(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError('');
    setProgress('');
  };

  return (
    <div style={{
      background: 'var(--glass)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${tool.color}22`,
          border: `1px solid ${tool.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem',
        }}>
          {tool.icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-1)' }}>{tool.title}</h3>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-3)' }}>{tool.desc}</p>
        </div>
      </div>

      {/* Drop zone */}
      {!result && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? tool.color : 'var(--border)'}`,
            borderRadius: 10,
            padding: '1.25rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? `${tool.color}0d` : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={tool.accept}
            multiple={tool.multiple}
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
          {files.length > 0 ? (
            <div>
              {files.map((f, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 2 }}>
                  📄 {f.name} <span style={{ color: 'var(--text-3)' }}>({(f.size / 1024).toFixed(0)} KB)</span>
                </div>
              ))}
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                Click to change
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                {tool.multiple ? 'Drop files here or click to browse' : 'Drop a file here or click to browse'}
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                Accepts: {tool.accept}
              </p>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '0.75rem', borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          fontSize: '0.8rem', color: '#ff6b6b', wordBreak: 'break-word',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          padding: '1rem', borderRadius: 10,
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#10b981' }}>✅ Ready to download!</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>
              {result.fileName} · {(result.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <a
              href={result.url}
              download={result.fileName}
              className="btn btn-primary btn-sm"
            >
              ↓ Download
            </a>
            <button onClick={reset} className="btn btn-ghost btn-sm">New</button>
          </div>
        </div>
      )}

      {/* Convert button */}
      {!result && (
        <button
          className="btn btn-primary btn-full"
          disabled={!files.length || converting}
          onClick={convert}
          style={{ background: tool.color }}
        >
          {converting ? (
            <><span className="spinner" /> {progress || 'Converting...'}</>
          ) : (
            `Convert ${files.length > 0 ? `(${files.length} file${files.length > 1 ? 's' : ''})` : ''}`
          )}
        </button>
      )}
    </div>
  );
}

function ConvertContent() {
  const { user, loading } = useAuth();
  const [token, setToken] = useState('');

  useEffect(() => {
    setToken(localStorage.getItem('clipdrop_token') || '');
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '5rem 1rem 2rem 1rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '0 0 0.5rem',
          }}>
            ⚡ File Converter
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '1rem', margin: 0 }}>
            Convert images, PDFs, and Office documents — free, private, no upload limits
          </p>
        </div>

        {/* Tool grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))',
          gap: '1.25rem',
        }}>
          {TOOLS.map(tool => (
            <ConvertTool key={tool.id} tool={tool} token={token} />
          ))}
        </div>

      </div>
      <ToastContainer />
    </div>
  );
}

export default function ConvertPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConvertContent />
      </ToastProvider>
    </AuthProvider>
  );
}
