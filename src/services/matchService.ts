import { randomUUID } from 'node:crypto';
import { MatchModel } from '../models/match.js';
import { MatchEventModel } from '../models/matchEvent.js';
import type { MatchScoreState, TeamSide } from '../scoring/types.js';
import { applyPoint, createInitialScoreState, forceFinish } from '../scoring/engine.js';
import { sseHub } from '../realtime/sseHub.js';
import { BadRequestError, ForbiddenError, NotFoundError, VersionConflictError } from './errors.js';

type ActorType = 'admin' | 'referee' | 'system';

interface RefereeActionContext {
  refereeId: string;
  matchId: string;
  matchVersion: number;
}

interface MatchStreamPayload {
  tournamentId: string;
  matchId: string;
  courtId?: string;
  status: string;
  currentServingSide?: TeamSide;
  winnerSide?: TeamSide;
  matchVersion: number;
  scoreState: MatchScoreState;
}

function toStringId(value: unknown): string {
  return String(value);
}

function assertVersion(currentVersion: number, expectedVersion: number): void {
  if (currentVersion !== expectedVersion) {
    throw new VersionConflictError(`Match version conflict: current=${currentVersion} expected=${expectedVersion}`);
  }
}

function publishMatchUpdate(payload: MatchStreamPayload): void {
  sseHub.publish(`tournament:${payload.tournamentId}`, {
    event: 'MATCH_UPDATED',
    data: payload
  });

  sseHub.publish(`match:${payload.matchId}`, {
    event: 'MATCH_UPDATED',
    data: payload
  });

  if (payload.courtId) {
    sseHub.publish(`court:${payload.courtId}`, {
      event: 'MATCH_UPDATED',
      data: payload
    });
  }
}

async function createEvent(params: {
  tournamentId: string;
  matchId: string;
  actorType: ActorType;
  actorId: string;
  action: string;
  payload?: Record<string, unknown>;
  beforeState?: MatchScoreState;
  afterState?: MatchScoreState;
}): Promise<string> {
  const event = await MatchEventModel.create({
    tournamentId: params.tournamentId,
    matchId: params.matchId,
    actorType: params.actorType,
    actorId: params.actorId,
    action: params.action,
    payload: params.payload,
    beforeState: params.beforeState,
    afterState: params.afterState
  });
  return toStringId(event._id);
}

async function getMatchOrThrow(matchId: string) {
  const match = await MatchModel.findById(matchId);
  if (!match) {
    throw new NotFoundError('Match not found');
  }
  return match;
}

function ensureRefereeAllowed(matchRefereeId: unknown, refereeId: string): void {
  if (!matchRefereeId) {
    return;
  }

  if (toStringId(matchRefereeId) !== refereeId) {
    throw new ForbiddenError('Referee cannot edit this match');
  }
}

function streamPayloadFromMatch(match: Awaited<ReturnType<typeof getMatchOrThrow>>): MatchStreamPayload {
  return {
    tournamentId: toStringId(match.tournamentId),
    matchId: toStringId(match._id),
    courtId: match.courtId ? toStringId(match.courtId) : undefined,
    status: match.status,
    currentServingSide: match.currentServingSide as TeamSide | undefined,
    winnerSide: match.winnerSide as TeamSide | undefined,
    matchVersion: match.matchVersion,
    scoreState: match.scoreState as MatchScoreState
  };
}

export async function createMatch(params: {
  tournamentId: string;
  round: string;
  matchNumber: number;
  courtId?: string;
  refereeId?: string;
  team1Id?: string;
  team2Id?: string;
  nextMatchId?: string;
  nextMatchSlot?: TeamSide;
}): Promise<unknown> {
  const match = await MatchModel.create({
    tournamentId: params.tournamentId,
    round: params.round,
    matchNumber: params.matchNumber,
    courtId: params.courtId,
    refereeId: params.refereeId,
    team1Id: params.team1Id,
    team2Id: params.team2Id,
    nextMatchId: params.nextMatchId,
    nextMatchSlot: params.nextMatchSlot,
    scoreState: createInitialScoreState(),
    publicToken: randomUUID().replace(/-/g, '')
  });

  return match.toObject();
}

export async function startMatch(params: RefereeActionContext & { firstServingSide: TeamSide }) {
  const match = await getMatchOrThrow(params.matchId);
  ensureRefereeAllowed(match.refereeId, params.refereeId);
  assertVersion(match.matchVersion, params.matchVersion);

  const beforeState = match.scoreState as MatchScoreState;
  const beforeStatus = match.status;

  match.status = 'live';
  match.firstServingSide = params.firstServingSide;
  match.currentServingSide = params.firstServingSide;
  match.matchVersion += 1;

  await match.save();

  await createEvent({
    tournamentId: toStringId(match.tournamentId),
    matchId: toStringId(match._id),
    actorType: 'referee',
    actorId: params.refereeId,
    action: 'MATCH_STARTED',
    payload: {
      firstServingSide: params.firstServingSide,
      beforeStatus,
      afterStatus: 'live'
    },
    beforeState,
    afterState: match.scoreState as MatchScoreState
  });

  publishMatchUpdate(streamPayloadFromMatch(match));
  return match.toObject();
}

export async function addPoint(params: RefereeActionContext & { teamSide: TeamSide }) {
  const match = await getMatchOrThrow(params.matchId);
  ensureRefereeAllowed(match.refereeId, params.refereeId);
  assertVersion(match.matchVersion, params.matchVersion);

  if (match.status !== 'live' && match.status !== 'warmup') {
    throw new BadRequestError('Cannot add point when match is not live');
  }

  const beforeState = match.scoreState as MatchScoreState;
  const beforeStatus = match.status;
  const beforeWinnerSide = match.winnerSide;

  const scored = applyPoint(beforeState, params.teamSide);

  match.scoreState = scored.state;

  if (scored.matchWonBy) {
    match.status = 'finished';
    match.winnerSide = scored.matchWonBy;
  }

  match.matchVersion += 1;
  await match.save();

  await createEvent({
    tournamentId: toStringId(match.tournamentId),
    matchId: toStringId(match._id),
    actorType: 'referee',
    actorId: params.refereeId,
    action: 'POINT_ADDED',
    payload: {
      teamSide: params.teamSide,
      gameWonBy: scored.gameWonBy,
      setWonBy: scored.setWonBy,
      matchWonBy: scored.matchWonBy,
      beforeStatus,
      afterStatus: match.status,
      beforeWinnerSide,
      afterWinnerSide: match.winnerSide,
      beforeServingSide: match.currentServingSide,
      afterServingSide: match.currentServingSide
    },
    beforeState,
    afterState: scored.state
  });

  publishMatchUpdate(streamPayloadFromMatch(match));
  return match.toObject();
}

export async function changeServer(params: RefereeActionContext & { servingSide: TeamSide }) {
  const match = await getMatchOrThrow(params.matchId);
  ensureRefereeAllowed(match.refereeId, params.refereeId);
  assertVersion(match.matchVersion, params.matchVersion);

  if (match.status !== 'live' && match.status !== 'warmup') {
    throw new BadRequestError('Cannot change server when match is not live');
  }

  const beforeState = match.scoreState as MatchScoreState;
  const beforeServingSide = match.currentServingSide;

  match.currentServingSide = params.servingSide;
  match.matchVersion += 1;
  await match.save();

  await createEvent({
    tournamentId: toStringId(match.tournamentId),
    matchId: toStringId(match._id),
    actorType: 'referee',
    actorId: params.refereeId,
    action: 'SERVER_CHANGED',
    payload: {
      beforeServingSide,
      afterServingSide: params.servingSide
    },
    beforeState,
    afterState: beforeState
  });

  publishMatchUpdate(streamPayloadFromMatch(match));
  return match.toObject();
}

export async function finishMatch(params: RefereeActionContext & { winnerSide?: TeamSide }) {
  const match = await getMatchOrThrow(params.matchId);
  ensureRefereeAllowed(match.refereeId, params.refereeId);
  assertVersion(match.matchVersion, params.matchVersion);

  const beforeState = match.scoreState as MatchScoreState;
  const winner = params.winnerSide ?? (beforeState.winnerSide as TeamSide | undefined);

  if (!winner) {
    throw new BadRequestError('winnerSide is required when score does not define a winner');
  }

  match.scoreState = forceFinish(beforeState, winner);
  match.winnerSide = winner;
  match.status = 'finished';
  match.matchVersion += 1;
  await match.save();

  await createEvent({
    tournamentId: toStringId(match.tournamentId),
    matchId: toStringId(match._id),
    actorType: 'referee',
    actorId: params.refereeId,
    action: 'MATCH_FINISHED',
    payload: {
      winnerSide: winner
    },
    beforeState,
    afterState: match.scoreState as MatchScoreState
  });

  publishMatchUpdate(streamPayloadFromMatch(match));
  return match.toObject();
}

export async function undoLastRefereeAction(params: RefereeActionContext) {
  const match = await getMatchOrThrow(params.matchId);
  ensureRefereeAllowed(match.refereeId, params.refereeId);
  assertVersion(match.matchVersion, params.matchVersion);

  const lastUndoable = await MatchEventModel.findOne({
    matchId: match._id,
    actorType: 'referee',
    actorId: params.refereeId,
    action: { $in: ['POINT_ADDED', 'SERVER_CHANGED', 'MATCH_FINISHED'] },
    isReverted: false
  }).sort({ createdAt: -1 });

  if (!lastUndoable) {
    throw new BadRequestError('No actions to undo');
  }

  const payload = (lastUndoable.payload as Record<string, unknown> | undefined) ?? {};
  const beforeState = match.scoreState as MatchScoreState;

  if (lastUndoable.beforeState) {
    match.scoreState = lastUndoable.beforeState as MatchScoreState;
  }

  if (typeof payload.beforeServingSide === 'string') {
    match.currentServingSide = payload.beforeServingSide as TeamSide;
  }

  if (typeof payload.beforeStatus === 'string') {
    match.status = payload.beforeStatus as typeof match.status;
  }

  if (payload.beforeWinnerSide === null || payload.beforeWinnerSide === undefined) {
    match.winnerSide = undefined;
  } else if (typeof payload.beforeWinnerSide === 'string') {
    match.winnerSide = payload.beforeWinnerSide as TeamSide;
  }

  match.matchVersion += 1;
  await match.save();

  const undoEvent = await MatchEventModel.create({
    tournamentId: match.tournamentId,
    matchId: match._id,
    actorType: 'referee',
    actorId: params.refereeId,
    action: 'UNDO',
    payload: {
      targetEventId: toStringId(lastUndoable._id)
    },
    beforeState,
    afterState: match.scoreState
  });

  lastUndoable.isReverted = true;
  lastUndoable.revertedByEventId = undoEvent._id;
  await lastUndoable.save();

  publishMatchUpdate(streamPayloadFromMatch(match));
  return match.toObject();
}

export async function listRefereeMatches(refereeId: string, tournamentId: string) {
  return MatchModel.find({
    tournamentId,
    $or: [{ refereeId }, { refereeId: { $exists: false } }, { refereeId: null }]
  })
    .sort({ matchNumber: 1 })
    .lean();
}

export async function listTournamentMatches(tournamentId: string) {
  return MatchModel.find({ tournamentId }).sort({ matchNumber: 1 }).lean();
}

export async function getMatchByPublicToken(publicToken: string) {
  return MatchModel.findOne({ publicToken }).lean();
}
