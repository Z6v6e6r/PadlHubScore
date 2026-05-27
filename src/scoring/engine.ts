import type {
  ApplyPointResult,
  MatchScoreState,
  SetState,
  TeamSide,
  TieBreakState
} from './types.js';

function opposite(side: TeamSide): TeamSide {
  return side === 'team1' ? 'team2' : 'team1';
}

function cloneState(state: MatchScoreState): MatchScoreState {
  return structuredClone(state);
}

export function createInitialScoreState(): MatchScoreState {
  return {
    bestOf: 3,
    setsToWin: 2,
    gamesToWinSet: 6,
    tieBreakAt: 6,
    tieBreakPointsToWin: 7,
    tieBreakWinBy: 2,
    deuceMode: 'double_advantage',
    sets: [
      {
        team1Games: 0,
        team2Games: 0
      }
    ],
    currentSetIndex: 0,
    currentGame: {
      team1Points: 0,
      team2Points: 0
    },
    completed: false
  };
}

function getCurrentSet(state: MatchScoreState): SetState {
  return state.sets[state.currentSetIndex]!;
}

function resolveGameWinner(state: MatchScoreState): TeamSide | null {
  const p1 = state.currentGame.team1Points;
  const p2 = state.currentGame.team2Points;

  if (p1 >= 4 && p2 <= 2) {
    return 'team1';
  }

  if (p2 >= 4 && p1 <= 2) {
    return 'team2';
  }

  if (p1 >= 3 && p2 >= 3) {
    const diff = p1 - p2;
    if (diff >= 3) {
      return 'team1';
    }
    if (diff <= -3) {
      return 'team2';
    }
  }

  return null;
}

function resolveTieBreakWinner(tieBreak: TieBreakState, state: MatchScoreState): TeamSide | null {
  const { team1Points, team2Points } = tieBreak;
  const diff = team1Points - team2Points;

  if (team1Points >= state.tieBreakPointsToWin && diff >= state.tieBreakWinBy) {
    return 'team1';
  }

  if (team2Points >= state.tieBreakPointsToWin && diff <= -state.tieBreakWinBy) {
    return 'team2';
  }

  return null;
}

function resolveSetWinner(set: SetState, state: MatchScoreState): TeamSide | null {
  const diff = set.team1Games - set.team2Games;

  if (set.team1Games >= state.gamesToWinSet && diff >= 2) {
    return 'team1';
  }

  if (set.team2Games >= state.gamesToWinSet && diff <= -2) {
    return 'team2';
  }

  return null;
}

function countWonSets(state: MatchScoreState, side: TeamSide): number {
  return state.sets.filter((set) => set.winnerSide === side).length;
}

function startNextSet(state: MatchScoreState): void {
  state.sets.push({ team1Games: 0, team2Games: 0 });
  state.currentSetIndex += 1;
  state.currentGame = {
    team1Points: 0,
    team2Points: 0
  };
}

function finalizeMatchIfNeeded(state: MatchScoreState): TeamSide | null {
  const team1WonSets = countWonSets(state, 'team1');
  const team2WonSets = countWonSets(state, 'team2');

  if (team1WonSets >= state.setsToWin) {
    state.completed = true;
    state.winnerSide = 'team1';
    return 'team1';
  }

  if (team2WonSets >= state.setsToWin) {
    state.completed = true;
    state.winnerSide = 'team2';
    return 'team2';
  }

  return null;
}

function applyGameWin(state: MatchScoreState, gameWinner: TeamSide): { setWonBy?: TeamSide; matchWonBy?: TeamSide } {
  const set = getCurrentSet(state);

  if (gameWinner === 'team1') {
    set.team1Games += 1;
  } else {
    set.team2Games += 1;
  }

  state.currentGame = {
    team1Points: 0,
    team2Points: 0
  };

  const setWinner = resolveSetWinner(set, state);
  if (setWinner) {
    set.winnerSide = setWinner;
    const matchWinner = finalizeMatchIfNeeded(state);
    if (!matchWinner) {
      startNextSet(state);
    }
    return { setWonBy: setWinner, matchWonBy: matchWinner ?? undefined };
  }

  if (set.team1Games === state.tieBreakAt && set.team2Games === state.tieBreakAt) {
    set.tieBreak = {
      team1Points: 0,
      team2Points: 0
    };
  }

  return {};
}

function applyTieBreakPoint(state: MatchScoreState, side: TeamSide): ApplyPointResult {
  const nextState = cloneState(state);
  const set = getCurrentSet(nextState);

  if (!set.tieBreak) {
    set.tieBreak = {
      team1Points: 0,
      team2Points: 0
    };
  }

  if (side === 'team1') {
    set.tieBreak.team1Points += 1;
  } else {
    set.tieBreak.team2Points += 1;
  }

  const tieBreakWinner = resolveTieBreakWinner(set.tieBreak, nextState);
  if (!tieBreakWinner) {
    return { state: nextState };
  }

  if (tieBreakWinner === 'team1') {
    set.team1Games += 1;
  } else {
    set.team2Games += 1;
  }

  set.winnerSide = tieBreakWinner;

  const matchWinner = finalizeMatchIfNeeded(nextState);
  if (!matchWinner) {
    startNextSet(nextState);
  }

  return {
    state: nextState,
    gameWonBy: tieBreakWinner,
    setWonBy: tieBreakWinner,
    matchWonBy: matchWinner ?? undefined
  };
}

export function applyPoint(state: MatchScoreState, side: TeamSide): ApplyPointResult {
  if (state.completed) {
    return { state };
  }

  const currentSet = getCurrentSet(state);
  if (currentSet.tieBreak) {
    return applyTieBreakPoint(state, side);
  }

  const nextState = cloneState(state);
  if (side === 'team1') {
    nextState.currentGame.team1Points += 1;
  } else {
    nextState.currentGame.team2Points += 1;
  }

  const gameWinner = resolveGameWinner(nextState);
  if (!gameWinner) {
    return { state: nextState };
  }

  const { setWonBy, matchWonBy } = applyGameWin(nextState, gameWinner);

  return {
    state: nextState,
    gameWonBy: gameWinner,
    setWonBy,
    matchWonBy
  };
}

export function forceFinish(state: MatchScoreState, winner: TeamSide): MatchScoreState {
  const nextState = cloneState(state);
  nextState.completed = true;
  nextState.winnerSide = winner;
  return nextState;
}

export function getServingSideAfterGame(current: TeamSide): TeamSide {
  return opposite(current);
}
