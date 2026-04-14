// server.ts - Fastify setup, plugins, routes, start

import Fastify from 'fastify';
import { authHook } from './auth.js';
import { chatRoute } from './routes/chat.js';
import { explainRoute } from './routes/explain.js';
import { imageRoute } from './routes/image.js';
import { gameRoute } from './routes/game.js';
import { webhookRoute } from './routes/webhook.js';

const server = Fastify({ logger: true });

// CORS - allow mobile app requests
server.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (request.method === 'OPTIONS') {
    reply.status(204).send();
  }
});

// Auth hook for /ai/* routes
server.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/ai/')) {
    await authHook(request, reply);
  }
});

// Health check
server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// AI routes (protected by auth hook)
server.post('/ai/chat', chatRoute);
server.post('/ai/explain', explainRoute);
server.post('/ai/image', imageRoute);
server.post('/ai/game', gameRoute);

// Webhook route (no auth - uses webhook secret)
server.post('/webhook/revenuecat', webhookRoute);

// Start
const port = parseInt(process.env.PORT || '3000', 10);
server.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Server listening at ${address}`);
});

export { server };
