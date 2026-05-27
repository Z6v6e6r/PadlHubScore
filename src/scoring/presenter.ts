import type { GameState, MatchScoreState, TeamSide } from './types.js';

const regularLabels = ['0', '15', '30', '40'] as const;

export interface DisplayScore {
  team1: string;
  team2: string;
  isDeuce: boolean;
}

function deuceLabels(game: GameState): DisplayScore {
  const diff = game.team1Points - game.team2Points;

  if (diff === 0) {
    return { team1: '40', team2: '40', isDeuce: true };
  }

  const leader: TeamSide = diff > 0 ? 'team1' : 'team2';
  const absDiff = Math.abs(diff);
  const stage = absDiff >= 2 ? 2 : 1;

  if (leader === 'team1') {
    return {
      team1: `БОЛЬШЕ ${stage}`,
      team2: `МЕНЬШЕ ${stage}`,
      isDeuce: false
    };
  }

  return {
    team1: `МЕНЬШЕ ${stage}`,
    team2: `БОЛЬШЕ ${stage}`,
    isDeuce: false
  };
}

export function formatCurrentGameScore(state: MatchScoreState): DisplayScore {
  const { team1Points, team2Points } = state.currentGame;

  if (team1Points >= 3 && team2Points >= 3) {
    return deuceLabels(state.currentGame);
  }

  return {
    team1: regularLabels[Math.min(team1Points, 3)] ?? '40',
    team2: regularLabels[Math.min(team2Points, 3)] ?? '40',
    isDeuce: false
  };
}
