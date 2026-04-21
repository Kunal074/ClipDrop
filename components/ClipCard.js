'use client';
import { useState, useEffect, useRef } from 'react';

// ─── Code detection heuristic ─────────────────────────────────
function looksLikeCode(text) {
  if (!text || text.length < 20) return false;
  const codePatterns = [
    /^```/m,                          // markdown code fences
    /^\s*(function|const|let|var|import|export|class|def|return|if|for|while)\s/m,
    /[{};]\s*$/m,                     // lines ending with {, }, ;
    /^\s*(#include|#define|package |using )/m,
    /=>/,                             // arrow functions
    /\w+\s*\(.*\)\s*{/,              // function signature
    /^\s{2,}[\w"']/m,                // indented code
  ];
  return codePatterns.filter(p => p.test(text)).length >= 2;
}

// ─── Syntax highlighted code block ───────────────────────────
function CodeBlock({ content }) {
  const ref = useRef(null);
  const [highlighted, setHighlighted] = useState('');

  useEffect(() => {
    import('highlight.js').then(hljs => {
      const result = hljs.default.highlightAuto(content);
      setHighlighted(result.value);
    });
  }, [content]);

  useEffect(() => {
    // Load highlight.js CSS once
    if (!document.getElementById('hljs-theme')) {
      const link = document.createElement('link');
      link.id = 'hljs-theme';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <pre ref={ref} style={{
      margin: 0, padding: '1rem', borderRadius: 8,
      background: '#1a1b26', overflowX: 'auto',
      fontSize: '0.78rem', lineHeight: 1.6,
      border: '1px solid rgba(255,255,255,0.07)',
      maxHeight: 280,
    }}>
      <code
        dangerouslySetInnerHTML={{ __html: highlighted || content }}
        style={{ fontFamily: "'Fira Code', 'Courier New', monospace" }}
      />
    </pre>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────
function ImageLightbox({ src, alt, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'zoom-out', backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.15s ease',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 24,
        background: 'rgba(255,255,255,0.1)', border: 'none',
        color: '#fff', fontSize: '1.5rem', cursor: 'pointer',
        borderRadius: '50%', width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>✕</button>
      <img src={src} alt={alt} onClick={e => e.stopPropagation()} style={{
        maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)', objectFit: 'contain', cursor: 'default',
      }} />
    </div>
  );
}

// ─── Main ClipCard ────────────────────────────────────────────
export default function ClipCard({ clip, onDelete, onEdit, onPin, onNewClip, showRoom = false }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(clip.content);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState('');

  // AI summary state
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryDone, setSummaryDone] = useState(false);

  const isCode = clip.type === 'text' && looksLikeCode(clip.content);
  const isLongText = clip.type === 'text' && (clip.content?.length || 0) > 100;

  // Live countdown for ALL clips (null expiresAt = Important/pinned = never expires)
  const [timeLeft, setTimeLeft] = useState(() =>
    clip.expiresAt ? Math.max(0, Math.floor((new Date(clip.expiresAt) - Date.now()) / 1000)) : null
  );

  useEffect(() => {
    if (!clip.expiresAt || clip.pinned) return;
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor((new Date(clip.expiresAt) - Date.now()) / 1000));
      setTimeLeft(secs);
    }, 1000);
    return () => clearInterval(interval);
  }, [clip.expiresAt, clip.pinned]);

  const formatTime = s => {
    if (s === null) return null;
    if (s <= 0) return 'Expired';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(clip.content || clip.fileName);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = clip.content || clip.fileName;
      document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEdit = async () => {
    if (!editing) { setEditing(true); return; }
    setLoading(true);
    await onEdit(clip.id, editValue);
    setEditing(false); setLoading(false);
  };

  // ── OCR: extract text from image ──
  const handleOcr = async () => {
    if (!clip.content) return;
    setOcrLoading(true);
    setOcrProgress('Loading OCR engine...');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(`Recognizing... ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const { data: { text } } = await worker.recognize(clip.content);
      await worker.terminate();

      const extracted = text.trim();
      if (!extracted) {
        alert('No text found in this image.');
        return;
      }
      onNewClip?.({ type: 'text', content: `[Extracted from image]\n${extracted}` });
    } catch (err) {
      console.error('[OCR]', err);
      alert('OCR failed: ' + err.message);
    } finally {
      setOcrLoading(false);
      setOcrProgress('');
    }
  };

  // ── AI Summary ──
  const handleSummarize = async () => {
    if (!clip.content || summaryDone) return;
    setSummaryLoading(true);
    try {
      const token = localStorage.getItem('clipdrop_token');
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: clip.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNewClip?.({ type: 'text', content: `✨ AI Summary:\n${data.summary}` });
      setSummaryDone(true);
    } catch (err) {
      alert('Summary failed: ' + err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const typeIcon = { text: '📝', image: '🖼️', file: '📦', link: '🔗' }[clip.type] || '📋';
  const typeBadgeClass = { text: 'badge-blue', image: 'badge-purple', file: 'badge-amber', link: 'badge-teal' }[clip.type] || 'badge-blue';

  return (
    <>
      {lightbox && <ImageLightbox src={clip.content} alt={clip.fileName || 'Image'} onClose={() => setLightbox(false)} />}

      <div className={`clip-card ${clip.pinned ? 'clip-card--pinned' : ''}`}>
        {/* Header */}
        <div className="clip-card__header">
          <div className="clip-card__meta">
            <span className={`badge ${typeBadgeClass}`}>{typeIcon} {clip.type}</span>
            {isCode && <span className="badge badge-blue" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{'</>'} code</span>}
            {clip.pinned && <span className="badge badge-pin">⭐ Important</span>}
            {!clip.pinned && clip.expiresAt && (
              <span className={`badge ${timeLeft <= 0 ? 'badge-expired' : 'badge-expires'}`} title="Auto-deletes when expired">
                ⏱ {timeLeft !== null ? (formatTime(timeLeft) || '—') : '30m'}
              </span>
            )}
          </div>
          <div className="clip-card__actions">
            <button onClick={copyToClipboard} className="icon-btn" title="Copy" id={`btn-copy-${clip.id}`}>
              {copied ? '✓' : '⎘'}
            </button>

            {/* Image-specific actions */}
            {clip.type === 'image' && clip.content && (
              <>
                <button onClick={() => setLightbox(true)} className="icon-btn" title="Full view" id={`btn-fullview-${clip.id}`}>🔍</button>
                <button
                  onClick={handleOcr}
                  disabled={ocrLoading}
                  className="icon-btn"
                  title="Extract text from image (OCR)"
                  id={`btn-ocr-${clip.id}`}
                >
                  {ocrLoading ? '⏳' : '🔤'}
                </button>
              </>
            )}

            {/* AI Summary for long text */}
            {isLongText && onNewClip && (
              <button
                onClick={handleSummarize}
                disabled={summaryLoading || summaryDone}
                className="icon-btn"
                title={summaryDone ? 'Summary created!' : 'AI Summarize'}
                id={`btn-summarize-${clip.id}`}
                style={{ color: summaryDone ? '#10b981' : undefined }}
              >
                {summaryLoading ? '⏳' : summaryDone ? '✓' : '✨'}
              </button>
            )}

            {['text', 'link'].includes(clip.type) && onEdit && (
              <button onClick={handleEdit} className="icon-btn" title="Edit" id={`btn-edit-${clip.id}`} disabled={loading}>
                {editing ? '💾' : '✏️'}
              </button>
            )}
            {onPin && (
              <button
                onClick={() => onPin(clip.id)}
                className="icon-btn"
                title={clip.pinned ? 'Remove Important (will expire in 30 min)' : 'Mark as Important (never expires)'}
                id={`btn-pin-${clip.id}`}
                style={{ color: clip.pinned ? '#f59e0b' : undefined }}
              >
                {clip.pinned ? '⭐' : '☆'}
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(clip.id)} className="icon-btn icon-btn--danger" title="Delete" id={`btn-delete-${clip.id}`}>
                🗑
              </button>
            )}
          </div>
        </div>

        {/* OCR progress bar */}
        {ocrProgress && (
          <div style={{
            padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: '#00d4ff',
            background: 'rgba(0,212,255,0.08)', borderRadius: 6, marginBottom: 4,
          }}>
            🔍 {ocrProgress}
          </div>
        )}

        {/* Content */}
        <div className="clip-card__body">
          {editing ? (
            <textarea className="clip-edit-input" value={editValue}
              onChange={e => setEditValue(e.target.value)} rows={4} autoFocus />
          ) : clip.type === 'image' && clip.content ? (
            <div className="clip-image-wrap" onClick={() => setLightbox(true)} style={{ cursor: 'zoom-in' }} title="Click to full view">
              <img src={clip.content} alt={clip.fileName || 'Image'} className="clip-image"
                style={{ width: '100%', borderRadius: 8, display: 'block' }}
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <a href={clip.content} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost btn-sm" style={{ display: 'none', marginTop: '0.5rem' }}
                onClick={e => e.stopPropagation()}>🔗 View Image</a>
            </div>
          ) : clip.type === 'file' ? (
            <div className="clip-file">
              <span className="clip-file__icon">📦</span>
              <div className="clip-file__info">
                <p className="clip-file__name">{clip.fileName}</p>
                <p className="clip-file__size">{(clip.fileSize / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              {clip.content && <a href={clip.content} download={clip.fileName} className="btn btn-ghost btn-sm">↓ Download</a>}
            </div>
          ) : clip.type === 'link' ? (
            <p className="clip-content">
              <a href={clip.content} target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', textDecoration: 'underline', wordBreak: 'break-all' }}>
                {clip.content}
              </a>
            </p>
          ) : isCode ? (
            <CodeBlock content={clip.content} />
          ) : (
            <p className="clip-content" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{clip.content || '—'}</p>
          )}
        </div>

        {/* Footer */}
        <div className="clip-card__footer">
          <span className="clip-meta-text">
            by {clip.username} · {new Date(clip.createdAt).toLocaleTimeString()}
            {clip.editedAt && ' (edited)'}
          </span>
          {showRoom && <span className="clip-meta-room">#{clip.roomCode}</span>}
        </div>
      </div>
    </>
  );
}
