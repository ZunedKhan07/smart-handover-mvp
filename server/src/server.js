import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connect_DB } from './config/db.js';
import { errorMiddleware } from './utils/errorHandler.js';
import repoRoutes from './routes/repoRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB database
connect_DB();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// API Routes Mounting
app.use('/api/repo', repoRoutes);
app.use('/api/reports', reportRoutes);

// Health check / root route
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Smart Handover API is running successfully!' });
});

// Global Error Handling Middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n ✅ Server is running smoothly on port ${PORT}`);
});