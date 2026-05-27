import { describe, expect, it } from 'vitest';
import { applyPoint, createInitialScoreState } from '../src/scoring/engine.js';
import { formatCurrentGameScore } from '../src/scoring/presenter.js';
import type { MatchScoreState, TeamSide } from '../src/scoring/types.js';

function applyMany(state: MatchScoreState, side: TeamSide, count: number): MatchScoreState {
  let next = state;
  for (let i = 0; i < count; i += 1) {
    next = applyPoint(next, side).state;
  }
  return next;
}

function winSimpleGame(state: MatchScoreState, side: TeamSide): MatchScoreState {
  return applyMany(state, side, 4);
}

describe('scoring engine', () => {
  it('starts with 0:0 and first set', () => {
    const state = createInitialScoreState();

    expect(state.currentSetIndex).toBe(0);
    expect(state.sets).toHaveLength(1);
    expect(state.currentGame.team1Points).toBe(0);
    expect(state.currentGame.team2Points).toBe(0);
  });

  it('formats regular points as 15/30/40', () => {
    let state = createInitialScoreState();

    state = applyPoint(state, 'team1').state;
    expect(formatCurrentGameScore(state)).toEqual({ team1: '15', team2: '0', isDeuce: false });

    state = applyPoint(state, 'team1').state;
    expect(formatCurrentGameScore(state)).toEqual({ team1: '30', team2: '0', isDeuce: false });

    state = applyPoint(state, 'team1').state;
    expect(formatCurrentGameScore(state)).toEqual({ team1: '40', team2: '0', isDeuce: false });
  });

  it('supports deuce with two advantage levels', () => {
    let state = createInitialScoreState();

    state = applyMany(state, 'team1', 3);
    state = applyMany(state, 'team2', 3);

    expect(formatCurrentGameScore(state)).toEqual({ team1: '40', team2: '40', isDeuce: true });

    state = applyPoint(state, 'team1').state;
    expect(formatCurrentGameScore(state)).toEqual({
      team1: 'БОЛЬШЕ 1',
      team2: 'МЕНЬШЕ 1',
      isDeuce: false
    });

    state = applyPoint(state, 'team1').state;
    expect(formatCurrentGameScore(state)).toEqual({
      team1: 'БОЛЬШЕ 2',
      team2: 'МЕНЬШЕ 2',
      isDeuce: false
    });

    const finalPoint = applyPoint(state, 'team1');
    expect(finalPoint.gameWonBy).toBe('team1');
    expect(finalPoint.state.sets[0]?.team1Games).toBe(1);
    expect(finalPoint.state.currentGame.team1Points).toBe(0);
    expect(finalPoint.state.currentGame.team2Points).toBe(0);
  });

  it('drops from advantage 2 to advantage 1 when trailing pair wins a point', () => {
    let state = createInitialScoreState();

    state = applyMany(state, 'team1', 3);
    state = applyMany(state, 'team2', 3);
    state = applyMany(state, 'team1', 2);

    expect(formatCurrentGameScore(state)).toEqual({
      team1: 'БОЛЬШЕ 2',
      team2: 'МЕНЬШЕ 2',
      isDeuce: false
    });

    state = applyPoint(state, 'team2').state;
    expect(formatCurrentGameScore(state)).toEqual({
      team1: 'БОЛЬШЕ 1',
      team2: 'МЕНЬШЕ 1',
      isDeuce: false
    });
  });

  it('starts tie-break at 6:6 and closes set by 2 points', () => {
    let state = createInitialScoreState();

    for (let i = 0; i < 6; i += 1) {
      state = winSimpleGame(state, 'team1');
      state = winSimpleGame(state, 'team2');
    }

    expect(state.sets[0]?.team1Games).toBe(6);
    expect(state.sets[0]?.team2Games).toBe(6);
    expect(state.sets[0]?.tieBreak).toBeDefined();

    for (let i = 0; i < 5; i += 1) {
      state = applyPoint(state, 'team1').state;
      state = applyPoint(state, 'team2').state;
    }

    state = applyPoint(state, 'team1').state;
    state = applyPoint(state, 'team1').state;

    expect(state.sets[0]?.winnerSide).toBe('team1');
    expect(state.currentSetIndex).toBe(1);
  });
});
