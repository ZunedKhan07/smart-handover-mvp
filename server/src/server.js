import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connect_DB } from './config/db.js';
import repoRoutes from './routes/repoRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { notFound, errorHandler } from './utils/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());

app.use(cors({ origin: origins, methods: ['GET', 'POST', 'PATCH', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
);
app.use('/api/repo', repoRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  if (!process.env.GEMINI_KEY) console.warn('Warning: GEMINI_KEY is not set - analysis requests will fail.');
  if (!process.env.GITHUB_TOKEN) console.warn('Warning: GITHUB_TOKEN is not set - GitHub rate limits will be very low (60 requests/hour).');
  try {
    await connect_DB();
    app.listen(PORT, () => console.log(`Smart Handover API listening on port ${PORT}`));
  } catch (err) {
    console.error(`Failed to start: ${err.message}`);
    process.exit(1);
  }
};

start();
