import { Router } from 'express';
import { getMatchByPublicToken } from '../services/matchService.js';
import { formatCurrentGameScore } from '../scoring/presenter.js';

export const publicRouter = Router();

publicRouter.get('/score/:publicToken', async (req, res) => {
  const match = await getMatchByPublicToken(req.params.publicToken);

  if (!match) {
    res.status(404).json({ message: 'Match not found' });
    return;
  }

  const currentGame = formatCurrentGameScore(match.scoreState);

  res.json({
    matchId: String(match._id),
    tournamentId: String(match.tournamentId),
    status: match.status,
    currentServingSide: match.currentServingSide,
    winnerSide: match.winnerSide,
    sets: match.scoreState.sets,
    currentGame
  });
});
