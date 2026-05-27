import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { env } from '../config/env.js';
import { CourtModel } from '../models/court.js';
import { MatchEventModel } from '../models/matchEvent.js';
import { MatchModel } from '../models/match.js';
import { RefereeModel } from '../models/referee.js';
import { TeamModel } from '../models/team.js';
import { TournamentModel } from '../models/tournament.js';
import { createMatch, listTournamentMatches } from '../services/matchService.js';
import { hashPin, hashRefereeToken } from '../utils/hash.js';

export const adminRouter = Router();

const createTournamentSchema = z.object({
  name: z.string().min(2),
  startsAt: z.string().datetime().optional()
});

adminRouter.post('/tournaments', async (req, res) => {
  const payload = createTournamentSchema.parse(req.body);

  const tournament = await TournamentModel.create({
    name: payload.name,
    startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined
  });

  res.status(201).json(tournament);
});

adminRouter.get('/tournaments/:tournamentId/overview', async (req, res) => {
  const { tournamentId } = req.params;

  const [teams, matches, active, finished, waiting, courts, freeCourts, onlineReferees] = await Promise.all([
    TeamModel.countDocuments({ tournamentId }),
    MatchModel.countDocuments({ tournamentId }),
    MatchModel.countDocuments({ tournamentId, status: 'live' }),
    MatchModel.countDocuments({ tournamentId, status: 'finished' }),
    MatchModel.countDocuments({ tournamentId, status: { $in: ['created', 'scheduled', 'warmup'] } }),
    CourtModel.countDocuments({ tournamentId }),
    CourtModel.countDocuments({ tournamentId, status: 'available' }),
    RefereeModel.countDocuments({
      tournamentId,
      status: 'active',
      lastSeenAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    })
  ]);

  res.json({
    tournamentId,
    teams,
    matches,
    activeMatches: active,
    finishedMatches: finished,
    waitingMatches: waiting,
    courts,
    freeCourts,
    refereesOnline: onlineReferees
  });
});

const teamSchema = z.object({
  player1Name: z.string().min(1),
  player2Name: z.string().min(1),
  displayName: z.string().optional(),
  seed: z.number().int().positive().optional()
});

adminRouter.post('/tournaments/:tournamentId/teams', async (req, res) => {
  const payload = teamSchema.parse(req.body);
  const team = await TeamModel.create({
    tournamentId: req.params.tournamentId,
    ...payload
  });
  res.status(201).json(team);
});

const courtSchema = z.object({
  name: z.string().min(1),
  number: z.number().int().positive(),
  stationName: z.string().optional()
});

adminRouter.post('/tournaments/:tournamentId/courts', async (req, res) => {
  const payload = courtSchema.parse(req.body);
  const court = await CourtModel.create({
    tournamentId: req.params.tournamentId,
    ...payload
  });
  res.status(201).json(court);
});

const refereeSchema = z.object({
  name: z.string().min(1),
  login: z.string().min(1).optional(),
  pin: z.string().min(4).max(8).optional(),
  assignedCourtIds: z.array(z.string()).optional(),
  assignedMatchIds: z.array(z.string()).optional()
});

adminRouter.post('/tournaments/:tournamentId/referees', async (req, res) => {
  const payload = refereeSchema.parse(req.body);

  const accessToken = nanoid(20);
  const pin = payload.pin ?? `${randomInt(1000, 10000)}`;

  const referee = await RefereeModel.create({
    tournamentId: req.params.tournamentId,
    name: payload.name,
    login: payload.login,
    accessTokenHash: hashRefereeToken(accessToken, env.REFEREE_TOKEN_SALT),
    pinHash: hashPin(pin, env.PIN_PEPPER),
    assignedCourtIds: payload.assignedCourtIds,
    assignedMatchIds: payload.assignedMatchIds,
    status: 'active'
  });

  res.status(201).json({
    ...referee.toObject(),
    accessToken,
    pin
  });
});

const createMatchSchema = z.object({
  round: z.string().min(1),
  matchNumber: z.number().int().positive(),
  courtId: z.string().optional(),
  refereeId: z.string().optional(),
  team1Id: z.string().optional(),
  team2Id: z.string().optional(),
  nextMatchId: z.string().optional(),
  nextMatchSlot: z.enum(['team1', 'team2']).optional()
});

adminRouter.post('/tournaments/:tournamentId/matches', async (req, res) => {
  const payload = createMatchSchema.parse(req.body);
  const match = await createMatch({
    tournamentId: req.params.tournamentId,
    ...payload
  });
  res.status(201).json(match);
});

adminRouter.get('/tournaments/:tournamentId/matches', async (req, res) => {
  const matches = await listTournamentMatches(req.params.tournamentId);
  res.json(matches);
});

adminRouter.get('/matches/:matchId/events', async (req, res) => {
  const events = await MatchEventModel.find({ matchId: req.params.matchId }).sort({ createdAt: -1 }).lean();
  res.json(events);
});
