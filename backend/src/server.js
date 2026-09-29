import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import runsRouter from './routes/runs.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/runs', runsRouter);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;

if (process.env.MONGO_URI) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (e) {
    console.warn('MongoDB unavailable, using in-memory store:', e.message);
  }
}

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
