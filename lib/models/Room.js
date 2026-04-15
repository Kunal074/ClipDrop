import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  name: { type: String, default: '' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);
