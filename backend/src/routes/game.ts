// routes/game.ts - POST /ai/game

import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkQuota, decrementQuota } from '../quota.js';
import { image } from '../gemini.js';
import { supabase } from '../auth.js';
import type { GameRequest, AuthPayload } from '../types.js';

export async function gameRoute(request: FastifyRequest, reply: FastifyReply) {
  const { userId, isSubscriber } = (request as any).auth as AuthPayload;
  const body = request.body as GameRequest;

  if (!body.eraId || !body.gameType || !body.topic) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: 'eraId, gameType, and topic are required' });
  }

  try {
    await checkQuota(userId, 'image_generate', isSubscriber);

    // Fetch era data from Supabase for contextual prompt
    const { data: eraData } = await supabase
      .from('eras')
      .select('era_id, title, timeline, description')
      .eq('era_id', body.eraId)
      .single();

    const eraName = eraData ? `${eraData.title} (${eraData.timeline})` : body.topic;

    const quotaRemaining = await decrementQuota(userId, 'image_generate', isSubscriber);

    // Generate the game image using the image endpoint logic
    const result = await image(
      {
        action: 'generate',
        prompt: `A historically accurate scene depicting ${body.topic} from ${eraName}. Educational, detailed, suitable for a jigsaw puzzle game.`,
        eraContext: { eraName },
      },
      quotaRemaining
    );

    return reply.send({
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      title: body.topic,
      description: eraData?.description || '',
      quotaRemaining,
    });
  } catch (error: any) {
    if (error.statusCode === 429) {
      return reply.status(429).send(error.body);
    }
    request.log.error({ error }, 'Game route error');

    // Fallback to placeholder image (same as current client behavior)
    return reply.send({
      imageBase64: null,
      fallbackUrl: `https://picsum.photos/seed/${encodeURIComponent(body.topic)}/400/400`,
      title: body.topic,
      description: '',
      quotaRemaining: {},
    });
  }
}
