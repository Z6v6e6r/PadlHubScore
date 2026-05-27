import { Router } from 'express';
import { z } from 'zod';
import { authenticateReferee } from '../services/refereeAuth.js';
import {
  addPoint,
  changeServer,
  finishMatch,
  listRefereeMatches,
  startMatch,
  undoLastRefereeAction
} from '../services/matchService.js';

export const refereeRouter = Router();

const tokenSchema = z.object({
  token: z.string().min(8),
  pin: z.string().min(4).max(8).optional()
});

refereeRouter.post('/session', async (req, res) => {
  const payload = tokenSchema.parse(req.body);
  const referee = await authenticateReferee(payload.token, payload.pin);

  res.json({
    refereeId: String(referee._id),
    tournamentId: String(referee.tournamentId),
    name: referee.name,
    assignedCourtIds: referee.assignedCourtIds,
    assignedMatchIds: referee.assignedMatchIds
  });
});

refereeRouter.post('/matches/list', async (req, res) => {
  const payload = tokenSchema.parse(req.body);
  const referee = await authenticateReferee(payload.token, payload.pin);

  const matches = await listRefereeMatches(String(referee._id), String(referee.tournamentId));
  res.json(matches);
});

const startSchema = tokenSchema.extend({
  matchVersion: z.number().int().nonnegative(),
  firstServingSide: z.enum(['team1', 'team2'])
});

refereeRouter.post('/matches/:matchId/start', async (req, res) => {
  const payload = startSchema.parse(req.body);
  const referee = await authenticateReferee(payload.token, payload.pin);

  const match = await startMatch({
    matchId: req.params.matchId,
    refereeId: String(referee._id),
    matchVersion: payload.matchVersion,
    firstServingSide: payload.firstServingSide
  });

  res.json(match);
});

const pointSchema = tokenSchema.extend({
  matchVersion: z.number().int().nonnegative(),
  teamSide: z.enum(['team1', 'team2'])
});

refereeRouter.post('/matches/:matchId/point', async (req, res) => {
  const payload = pointSchema.parse(req.body);
  const referee = await authenticateReferee(payload.token, payload.pin);

  const match = await addPoint({
    matchId: req.params.matchId,
    refereeId: String(referee._id),
    matchVersion: payload.matchVersion,
    teamSide: payload.teamSide
  });

  res.json(match);
});

const changeServerSchema = tokenSchema.extend({
  matchVersion: z.number().int().nonnegative(),
  servingSide: z.enum(['team1', 'team2'])
});

refereeRouter.post('/matches/:matchId/change-server', async (req, res) => {
  const payload = changeServerSchema.parse(req.body);
  const referee = await authenticateReferee(payload.token, payload.pin);

  const match = await changeServer({
    matchId: req.params.matchId,
    refereeId: String(referee._id),
    matchVersion: payload.matchVersion,
    servingSide: payload.servingSide
  });

  res.json(match);
});

const undoSchema = tokenSchema.extend({
  matchVersion: z.number().int().nonnegative()
});

refereeRouter.post('/matches/:matchId/undo', async (req, res) => {
  const payload = undoSchema.parse(req.body);
  const referee = await authenticateReferee(payload.token, payload.pin);

  const match = await undoLastRefereeAction({
    matchId: req.params.matchId,
    refereeId: String(referee._id),
    matchVersion: payload.matchVersion
  });

  res.json(match);
});

const finishSchema = tokenSchema.extend({
  matchVersion: z.number().int().nonnegative(),
  winnerSide: z.enum(['team1', 'team2']).optional()
});

refereeRouter.post('/matches/:matchId/finish', async (req, res) => {
  const payload = finishSchema.parse(req.body);
  const referee = await authenticateReferee(payload.token, payload.pin);

  const match = await finishMatch({
    matchId: req.params.matchId,
    refereeId: String(referee._id),
    matchVersion: payload.matchVersion,
    winnerSide: payload.winnerSide
  });

  res.json(match);
});
