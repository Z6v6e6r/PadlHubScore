export type TeamSide = 'team1' | 'team2';

export interface GameState {
  team1Points: number;
  team2Points: number;
}

export interface TieBreakState {
  team1Points: number;
  team2Points: number;
}

export interface SetState {
  team1Games: number;
  team2Games: number;
  tieBreak?: TieBreakState;
  winnerSide?: TeamSide;
}

export interface MatchScoreState {
  bestOf: 3;
  setsToWin: 2;
  gamesToWinSet: 6;
  tieBreakAt: 6;
  tieBreakPointsToWin: 7;
  tieBreakWinBy: 2;
  deuceMode: 'double_advantage';
  sets: SetState[];
  currentSetIndex: number;
  currentGame: GameState;
  completed: boolean;
  winnerSide?: TeamSide;
}

export interface ApplyPointResult {
  state: MatchScoreState;
  gameWonBy?: TeamSide;
  setWonBy?: TeamSide;
  matchWonBy?: TeamSide;
}
