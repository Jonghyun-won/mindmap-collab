import { Server } from '@hocuspocus/server';
import { config } from './config';
import { database, parseDocumentName } from './extensions/database';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();

// Health check endpoint for Railway
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'mindmap-websocket', port: config.port });
});

const httpServer = createServer(app);

// Create Hocuspocus server (without port - we manage the HTTP server ourselves)
const hocuspocus = Server.configure({
  extensions: [database],

  async onConnect({ documentName, socketId }) {
    const { mindmapId, chapterId } = parseDocumentName(documentName);

    if (chapterId) {
      console.log(`✅ Client ${socketId} connected: mindmap=${mindmapId}, chapter=${chapterId}`);
    } else {
      console.log(`✅ Client ${socketId} connected (legacy): mindmap=${mindmapId}`);
    }
    return {};
  },

  async onDisconnect({ documentName, clientsCount, socketId }) {
    const { mindmapId, chapterId } = parseDocumentName(documentName);

    if (chapterId) {
      console.log(`❌ Client ${socketId} disconnected: mindmap=${mindmapId}, chapter=${chapterId}, remaining=${clientsCount}`);
    } else {
      console.log(`❌ Client ${socketId} disconnected (legacy): mindmap=${mindmapId}, remaining=${clientsCount}`);
    }
  },

  async onChange({ documentName }) {
    const { mindmapId, chapterId } = parseDocumentName(documentName);

    if (chapterId) {
      console.log(`📝 Document changed: mindmap=${mindmapId}, chapter=${chapterId}`);
    } else {
      console.log(`📝 Document changed (legacy): mindmap=${mindmapId}`);
    }
  },

  async onLoadDocument({ documentName }) {
    const { mindmapId, chapterId } = parseDocumentName(documentName);

    if (chapterId) {
      console.log(`📄 Loading document: mindmap=${mindmapId}, chapter=${chapterId}`);
    } else {
      console.log(`📄 Loading document (legacy): mindmap=${mindmapId}`);
    }
  },
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  hocuspocus.handleConnection(ws, req);
});

// Start listening
httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`\n🚀 Hocuspocus WebSocket server running!`);
  console.log(`   HTTP: http://0.0.0.0:${config.port}`);
  console.log(`   WebSocket: ws://0.0.0.0:${config.port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT env: ${process.env.PORT || 'not set'}`);
  console.log(`   Ready for real-time collaboration! 🎉\n`);
});
