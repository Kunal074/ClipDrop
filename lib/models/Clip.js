import mongoose from 'mongoose';

const ClipSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  username: { type: String, default: 'Anonymous' },
  type: { type: String, enum: ['text', 'image', 'file', 'link'], required: true },
  content: { type: String, default: '' },         // text content or URL
  fileName: { type: String, default: '' },         // original file name
  fileSize: { type: Number, default: 0 },          // bytes
  fileKey: { type: String, default: '' },          // R2 storage key
  mimeType: { type: String, default: '' },
  pinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 60 * 1000) },
});

// MongoDB TTL index: auto-delete documents when expiresAt is reached
// Only applies to non-pinned clips (enforced at app level)
ClipSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Clip || mongoose.model('Clip', ClipSchema);
