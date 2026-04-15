'use client';
import { useState } from 'react';

export default function ClipCard({ clip, onDelete, onEdit, onPin, showRoom = false }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(clip.content);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const timeLeft = clip.isLargeFile && clip.expiresAt
    ? Math.max(0, Math.floor((new Date(clip.expiresAt) - Date.now()) / 1000))
    : null;

  const formatTime = (s) => {
    if (s <= 0) return 'Expired';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(clip.content || clip.fileName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = clip.content || clip.fileName;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEdit = async () => {
    if (!editing) { setEditing(true); return; }
    setLoading(true);
    await onEdit(clip.id, editValue);
    setEditing(false);
    setLoading(false);
  };

  const typeIcon = { text: '📝', image: '🖼️', file: '📦', link: '🔗' }[clip.type] || '📋';
  const typeBadgeClass = { text: 'badge-blue', image: 'badge-purple', file: 'badge-amber', link: 'badge-teal' }[clip.type] || 'badge-blue';

  return (
    <div className={`clip-card ${clip.pinned ? 'clip-card--pinned' : ''}`}>
      {/* Header */}
      <div className="clip-card__header">
        <div className="clip-card__meta">
          <span className={`badge ${typeBadgeClass}`}>{typeIcon} {clip.type}</span>
          {clip.pinned && <span className="badge badge-pin">📌 Pinned</span>}
          {clip.isLargeFile && (
            <span className={`badge ${timeLeft <= 0 ? 'badge-expired' : 'badge-expires'}`}>
              ⏱ {timeLeft !== null ? formatTime(timeLeft) : '30m'}
            </span>
          )}
        </div>
        <div className="clip-card__actions">
          <button onClick={copyToClipboard} className="icon-btn" title="Copy" id={`btn-copy-${clip.id}`}>
            {copied ? '✓' : '⎘'}
          </button>
          {['text', 'link'].includes(clip.type) && onEdit && (
            <button onClick={handleEdit} className="icon-btn" title="Edit" id={`btn-edit-${clip.id}`}
              disabled={loading}>
              {editing ? '💾' : '✏️'}
            </button>
          )}
          {onPin && (
            <button onClick={() => onPin(clip.id)} className="icon-btn" title={clip.pinned ? 'Unpin' : 'Pin'}
              id={`btn-pin-${clip.id}`}>
              {clip.pinned ? '📌' : '🔖'}
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(clip.id)} className="icon-btn icon-btn--danger"
              title="Delete" id={`btn-delete-${clip.id}`}>
              🗑
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="clip-card__body">
        {editing ? (
          <textarea
            className="clip-edit-input"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            rows={4}
            autoFocus
          />
        ) : clip.type === 'image' && clip.content ? (
          <div className="clip-image-wrap">
            <img src={clip.content} alt={clip.fileName || 'Image'} className="clip-image" />
          </div>
        ) : clip.type === 'file' ? (
          <div className="clip-file">
            <span className="clip-file__icon">📦</span>
            <div className="clip-file__info">
              <p className="clip-file__name">{clip.fileName}</p>
              <p className="clip-file__size">{(clip.fileSize / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {clip.content && (
              <a href={clip.content} download={clip.fileName} className="btn btn-ghost btn-sm">
                ↓ Download
              </a>
            )}
          </div>
        ) : (
          <p className="clip-content">{clip.content || '—'}</p>
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
  );
}
