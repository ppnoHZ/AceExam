import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dbProvider from './database.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io/aceexam',
  cors: {
    origin: '*',
  },
});

const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await dbProvider.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/questions', async (req, res) => {
  try {
    const questions = await dbProvider.getAllQuestions();
    res.json(questions);
  } catch (err) {
    console.error('[API] Error fetching questions:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Use a Map to track unique fingerprints and their associated sockets
const fingerprintSessions = new Map();

io.on('connection', (socket) => {
  const fingerprint = socket.handshake.auth?.fingerprint || `temp-${socket.id}`;
  socket.fp = fingerprint; // Store on socket for easy retrieval during disconnect

  if (!fingerprintSessions.has(fingerprint)) {
    fingerprintSessions.set(fingerprint, new Set());
  }
  fingerprintSessions.get(fingerprint).add(socket.id);

  console.log(`[Socket] Connected: ${socket.id} (FP: ${fingerprint}). Unique users: ${fingerprintSessions.size}`);

  // Broadcast the unique count to all clients immediately
  io.emit('user_count_update', { count: fingerprintSessions.size });

  socket.on('submit_answer', async (data) => {
    console.log(`[Socket] Answer from ${fingerprint}:`, data);
    
    // Save to DB via provider
    try {
      await dbProvider.saveAnswer({
        fingerprint,
        socketId: socket.id,
        questionId: data.questionId,
        isCorrect: data.isCorrect
      });
    } catch (err) {
      console.error('[DB] Failed to save answer:', err);
    }

    // Broadcast to all other clients
    socket.broadcast.emit('broadcast_answer', {
      ...data,
      userId: socket.id,
      fingerprint: fingerprint,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    const fp = socket.fp;
    if (fingerprintSessions.has(fp)) {
      const sockets = fingerprintSessions.get(fp);
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        fingerprintSessions.delete(fp);
      }
    }
    console.log(`[Socket] Disconnected: ${socket.id}. Unique users: ${fingerprintSessions.size}`);
    io.emit('user_count_update', { count: fingerprintSessions.size });
  });
});

httpServer.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
