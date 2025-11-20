import express from 'express';
import cors from 'cors';
import { db } from './db';
import { memories, chatMessages, settings } from './schema';
import { eq, desc, and, or, like, sql } from 'drizzle-orm';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Nomorize Backend API',
    version: '1.0.0',
    endpoints: {
      memories: '/api/memories',
      chatMessages: '/api/chat-messages',
      settings: '/api/settings'
    }
  });
});

// Memory routes
app.get('/api/memories', async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, tags, pinnedOnly } = req.query;

    let whereConditions = [];

    if (type) {
      whereConditions.push(eq(memories.type, type as string));
    }

    if (pinnedOnly === 'true') {
      whereConditions.push(eq(memories.isPinned, true));
    }

    const result = await db
      .select()
      .from(memories)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(memories.timestamp))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(result);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

app.post('/api/memories', async (req, res) => {
  try {
    const memoryData = req.body;
    const result = await db.insert(memories).values(memoryData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

app.put('/api/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const result = await db
      .update(memories)
      .set(updates)
      .where(eq(memories.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

app.delete('/api/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.delete(memories).where(eq(memories.id, id)).returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// Chat routes
app.get('/api/chat-messages', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.timestamp))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(result);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

app.post('/api/chat-messages', async (req, res) => {
  try {
    const messageData = req.body;
    const result = await db.insert(chatMessages).values(messageData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating chat message:', error);
    res.status(500).json({ error: 'Failed to create chat message' });
  }
});

// Settings routes
app.get('/api/settings', async (req, res) => {
  try {
    // For now, return the first settings record (assuming single user)
    const result = await db.select().from(settings).limit(1);
    res.json(result[0] || null);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const settingsData = req.body;

    // For now, update the first settings record or create if none exists
    const existing = await db.select().from(settings).limit(1);

    if (existing.length > 0) {
      const result = await db
        .update(settings)
        .set(settingsData)
        .where(eq(settings.id, existing[0].id))
        .returning();
      res.json(result[0]);
    } else {
      // Create new settings (id is auto-generated)
      const result = await db.insert(settings).values(settingsData).returning();
      res.json(result[0]);
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});