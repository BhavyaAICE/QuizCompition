import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import quizRoutes from './routes/quiz.routes';
import participantRoutes from './routes/participant.routes';
import { setupSocketHandlers } from './socket';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for bulk imports
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/participant', participantRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Echona API is running' });
});

// Socket.io Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://127.0.0.1:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  }
});
app.set('io', io);

// Register socket event handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`⚓ Echona API running on port ${PORT}`);
});
