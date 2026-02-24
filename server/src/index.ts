import { Server } from '@hocuspocus/server';
import { config } from './config';
import { database } from './extensions/database';
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
    console.log(`✅ Client ${socketId} connected to document: ${documentName}`);
    return {};
  },

  async onDisconnect({ documentName, clientsCount, socketId }) {
    console.log(`❌ Client ${socketId} disconnected from document: ${documentName}`);
    console.log(`   Remaining clients: ${clientsCount}`);
  },

  async onChange({ documentName }) {
    console.log(`📝 Document changed: ${documentName}`);
  },

  async onLoadDocument({ documentName }) {
    console.log(`📄 Loading document: ${documentName}`);
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
