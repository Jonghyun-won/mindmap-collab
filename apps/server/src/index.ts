import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { config } from './config';
// import { database } from './extensions/database';
// import { auth } from './extensions/auth';

// Simple in-memory database for development
const database = new Database({
  fetch: async ({ documentName }) => {
    console.log(`Fetching document: ${documentName}`);
    // Return null to create new document
    return null;
  },
  store: async ({ documentName, state }) => {
    console.log(`Storing document: ${documentName}, size: ${state.length} bytes`);
    // In production, save to Supabase
    // For now, just log
  },
});

// Create Hocuspocus server
const server = Server.configure({
  port: config.port,

  extensions: [
    database,
    // Uncomment when JWT authentication is set up
    // auth,
  ],

  async onConnect({ documentName, requestHeaders, socketId }) {
    console.log(`✅ Client ${socketId} connected to document: ${documentName}`);
    return {};
  },

  async onDisconnect({ documentName, clientsCount, socketId }) {
    console.log(`❌ Client ${socketId} disconnected from document: ${documentName}`);
    console.log(`   Remaining clients: ${clientsCount}`);
  },

  async onChange({ documentName, context }) {
    console.log(`📝 Document changed: ${documentName}`);
  },

  async onLoadDocument({ documentName }) {
    console.log(`📄 Loading document: ${documentName}`);
  },

  async onListen() {
    console.log(`\n🚀 Hocuspocus WebSocket server running!`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Ready for real-time collaboration! 🎉\n`);
  },
});

server.listen();
