// routes/image.ts - POST /ai/image

import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkQuota, decrementQuota } from '../quota.js';
import { image } from '../gemini.js';
import type { ImageRequest, AuthPayload } from '../types.js';

export async function imageRoute(request: FastifyRequest, reply: FastifyReply) {
  const { userId, isSubscriber } = (request as any).auth as AuthPayload;
  const body = request.body as ImageRequest;

  if (!body.action || !body.prompt) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: 'action and prompt are required' });
  }

  const quotaType = body.action === 'edit' ? 'image_edit' : 'image_generate';

  try {
    await checkQuota(userId, quotaType, isSubscriber);

    const result = await image(body, {});

    const quotaRemaining = await decrementQuota(userId, quotaType, isSubscriber);
    result.quotaRemaining = quotaRemaining;

    return reply.send(result);
  } catch (error: any) {
    if (error.statusCode === 429) {
      return reply.status(429).send(error.body);
    }
    request.log.error({ error }, 'Image route error');
    return reply.status(502).send({ code: 'AI_ERROR', message: 'Failed to generate image' });
  }
}
