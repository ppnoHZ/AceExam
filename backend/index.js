import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dbProvider from './database.js';
import { generateMemoryAid } from './ai.js';

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

app.post('/api/ai/memory-aid', async (req, res) => {
  const { questionId } = req.body;
  
  const idValue = Number.parseInt(questionId, 10);
  if (Number.isNaN(idValue)) {
    return res.status(400).json({ error: 'Valid numeric questionId is required' });
  }

  try {
    const question = await dbProvider.getQuestionById(idValue);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // If explanation already exists in DB, return it directly
    if (question.explanation_en && question.explanation_cn) {
      console.log(`[AI] Returning existing memory aid for question ${idValue} from DB`);
      return res.json({
        memory_aid_en: question.explanation_en,
        memory_aid_cn: question.explanation_cn
      });
    }

    const memoryAid = await generateMemoryAid(question);
    
    // Persist to database so we don't need to call AI next time
    try {
      await dbProvider.updateQuestionExplanation(
        idValue,
        memoryAid.memory_aid_en,
        memoryAid.memory_aid_cn
      );
      console.log(`[AI] Successfully persisted memory aid for question ${idValue} to DB`);
    } catch (dbErr) {
      console.error('[DB] Failed to persist memory aid:', dbErr);
      // We still return the memoryAid to the user even if DB update fails
    }

    res.json(memoryAid);
  } catch (err) {
    console.error('[API] Error calling Gemini API:', err);
    res.status(500).json({ error: 'Failed to generate memory aid' });
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
    
    const { questionId, isCorrect } = data;
    if (typeof questionId !== 'number') {
      console.warn(`[Socket] Invalid questionId received from ${fingerprint}`);
      return;
    }

    // Save to DB via provider
    try {
      await dbProvider.saveAnswer({
        fingerprint,
        socketId: socket.id,
        questionId: questionId,
        isCorrect: isCorrect === true
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
