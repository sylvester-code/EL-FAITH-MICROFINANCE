import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import prisma from './config/prisma.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow downloading generated PDF receipts
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('vercel.app') ||
      origin.includes('onrender.com') ||
      (process.env.FRONTEND_URL && (origin === process.env.FRONTEND_URL || origin.startsWith(process.env.FRONTEND_URL))) ||
      (process.env.CLIENT_ORIGIN && origin === process.env.CLIENT_ORIGIN)
    ) {
      return callback(null, true);
    }
    // allow all origins in production if needed
    return callback(null, true);
  },
  credentials: true,
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploaded documents & generated PDF receipts
app.use('/uploads', express.static(uploadDir));

// Mount API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    system: 'EL-FAITH MICROFINANCE API',
    location: 'Wassa Powuako, Western Region, Ghana',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static build if available (for unified Render deployment)
const possibleFrontendPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(__dirname, './public'),
];

let frontendDist = possibleFrontendPaths.find((p) => fs.existsSync(p));

if (frontendDist) {
  console.log(`Serving static frontend build from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`  EL-FAITH MICROFINANCE - Financial Core Server`);
  console.log(`  Location: Wassa Powuako, Western Region, Ghana`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`=======================================================`);

  // Verify database connectivity & auto-seed if newly provisioned database
  try {
    const userCount = await prisma.user.count();
    console.log(`✓ Database connected. Current registered users: ${userCount}`);
    if (userCount === 0) {
      console.log('No users found in database. Running initial seed (Super Admin: ELIJAH / APPIAH)...');
      const { spawn } = await import('child_process');
      const seedProc = spawn('node', ['src/database/seed.js'], { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
      seedProc.on('exit', (code) => {
        console.log(`Initial seed script exited with code ${code}`);
      });
    }
  } catch (err) {
    console.warn(`Database connection notice: ${err.message}`);
  }
});

export default app;

