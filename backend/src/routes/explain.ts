// routes/explain.ts - POST /ai/explain

import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkQuota, decrementQuota } from '../quota.js';
import { explain } from '../gemini.js';
import type { ExplainRequest, AuthPayload } from '../types.js';

export async function explainRoute(request: FastifyRequest, reply: FastifyReply) {
  const { userId, isSubscriber } = (request as any).auth as AuthPayload;
  const body = request.body as ExplainRequest;

  if (!body.questions?.length || !body.userAnswers?.length || !body.eraName) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: 'questions, userAnswers, and eraName are required' });
  }

  try {
    await checkQuota(userId, 'chat', isSubscriber);

    const result = await explain(body, {});

    const quotaRemaining = await decrementQuota(userId, 'chat', isSubscriber);
    result.quotaRemaining = quotaRemaining;

    return reply.send(result);
  } catch (error: any) {
    if (error.statusCode === 429) {
      return reply.status(429).send(error.body);
    }
    request.log.error({ error }, 'Explain route error');
    return reply.status(502).send({ code: 'AI_ERROR', message: 'Failed to generate explanations' });
  }
}
