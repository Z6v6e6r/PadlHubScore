import { Schema, model, type InferSchemaType } from 'mongoose';

const matchSchema = new Schema(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    round: { type: String, required: true },
    matchNumber: { type: Number, required: true },
    courtId: { type: Schema.Types.ObjectId, ref: 'Court', required: false, index: true },
    refereeId: { type: Schema.Types.ObjectId, ref: 'Referee', required: false, index: true },
    team1Id: { type: Schema.Types.ObjectId, ref: 'Team', required: false },
    team2Id: { type: Schema.Types.ObjectId, ref: 'Team', required: false },
    status: {
      type: String,
      enum: [
        'created',
        'scheduled',
        'warmup',
        'live',
        'paused',
        'finished',
        'confirmed',
        'cancelled',
        'walkover'
      ],
      default: 'created'
    },
    scoreState: { type: Schema.Types.Mixed, required: true },
    firstServingSide: { type: String, enum: ['team1', 'team2'], required: false },
    currentServingSide: { type: String, enum: ['team1', 'team2'], required: false },
    winnerSide: { type: String, enum: ['team1', 'team2'], required: false },
    nextMatchId: { type: Schema.Types.ObjectId, ref: 'Match', required: false },
    nextMatchSlot: { type: String, enum: ['team1', 'team2'], required: false },
    matchVersion: { type: Number, required: true, default: 0 },
    publicToken: { type: String, required: true, unique: true, index: true }
  },
  { timestamps: true }
);

export type MatchDocument = InferSchemaType<typeof matchSchema> & { _id: string };
export const MatchModel = model('Match', matchSchema);
