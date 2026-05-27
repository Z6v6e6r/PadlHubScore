# PadlHubScore MVP

MVP backend for live scoring padel tournaments.

## Scope of current stage

- Separate project/repository from CUP.
- MongoDB-based API.
- Referee flow: start match, add point, undo, change server, finish match.
- Scoring engine:
  - points: `0 -> 15 -> 30 -> 40`
  - custom deuce: `БОЛЬШЕ/МЕНЬШЕ 1`, then `БОЛЬШЕ/МЕНЬШЕ 2`, then game
  - set to 6 games (win by 2)
  - tie-break at 6:6 to 7 points (win by 2)
  - match best-of-3 sets
- Event sourcing for actions (`MatchEvent`) + snapshot in `Match`.
- Optimistic concurrency via `matchVersion`.
- Real-time stream via SSE.

## API groups

- `/api/admin/*`
- `/api/referee/*`
- `/api/public/*`
- `/api/stream/*`

## Quick start

1. Copy env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Run dev server:

```bash
npm run dev
```

4. Run tests:

```bash
npm test
```

## SSE (real-time)

- `GET /api/stream/tournament/:tournamentId`
- `GET /api/stream/match/:matchId`
- `GET /api/stream/court/:courtId`

The server pushes `MATCH_UPDATED` events after each scoring action.

## Next step

- Add bracket generator + auto-advance winner to `nextMatchId/nextMatchSlot`.
- Add admin score correction endpoints.
- Add referee mobile web UI and public screen UI.
- Add Redis pub/sub for multi-instance SSE broadcasting.
