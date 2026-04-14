// routes/chat.ts - POST /ai/chat

import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkQuota, decrementQuota } from '../quota.js';
import { chat } from '../gemini.js';
import type { ChatRequest, AuthPayload } from '../types.js';

export async function chatRoute(request: FastifyRequest, reply: FastifyReply) {
  const { userId, isSubscriber } = (request as any).auth as AuthPayload;
  const body = request.body as ChatRequest;

  if (!body.message) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: 'message is required' });
  }

  try {
    // Check quota BEFORE calling Gemini (reject early if exceeded)
    await checkQuota(userId, 'chat', isSubscriber);

    // Call Gemini (quota not yet decremented — if this fails, no slot is lost)
    const result = await chat(body, {});

    // Decrement quota AFTER success and attach remaining to response
    const quotaRemaining = await decrementQuota(userId, 'chat', isSubscriber);
    result.quotaRemaining = quotaRemaining;

    return reply.send(result);
  } catch (error: any) {
    if (error.statusCode === 429) {
      return reply.status(429).send(error.body);
    }
    request.log.error({ error }, 'Chat route error');
    return reply.status(502).send({ code: 'AI_ERROR', message: 'Failed to generate response' });
  }
}
