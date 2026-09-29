import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    index: Number,
    durationSec: Number,
    status: { type: String, enum: ['pending', 'open', 'closed', 'failed'], default: 'pending' },
    startedAt: Date,
    closedAt: Date,
    error: String,
  },
  { _id: false }
);

const runSchema = new mongoose.Schema(
  {
    url: String,
    count: Number,
    minSec: Number,
    maxSec: Number,
    sessions: [sessionSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Run', runSchema);
