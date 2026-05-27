import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { sseHub } from '../realtime/sseHub.js';

export const streamRouter = Router();

function openStream(res: import('express').Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
}

streamRouter.get('/tournament/:tournamentId', (req, res) => {
  const subscriberId = randomUUID();
  const topic = `tournament:${req.params.tournamentId}`;

  openStream(res);
  sseHub.subscribe(topic, subscriberId, res);

  req.on('close', () => {
    sseHub.unsubscribe(topic, subscriberId);
  });
});

streamRouter.get('/match/:matchId', (req, res) => {
  const subscriberId = randomUUID();
  const topic = `match:${req.params.matchId}`;

  openStream(res);
  sseHub.subscribe(topic, subscriberId, res);

  req.on('close', () => {
    sseHub.unsubscribe(topic, subscriberId);
  });
});

streamRouter.get('/court/:courtId', (req, res) => {
  const subscriberId = randomUUID();
  const topic = `court:${req.params.courtId}`;

  openStream(res);
  sseHub.subscribe(topic, subscriberId, res);

  req.on('close', () => {
    sseHub.unsubscribe(topic, subscriberId);
  });
});
