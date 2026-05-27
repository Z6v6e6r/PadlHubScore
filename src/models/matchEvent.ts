import { Schema, model, type InferSchemaType } from 'mongoose';

const matchEventSchema = new Schema(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    actorType: { type: String, enum: ['admin', 'referee', 'system'], required: true },
    actorId: { type: String, required: true },
    action: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: false },
    beforeState: { type: Schema.Types.Mixed, required: false },
    afterState: { type: Schema.Types.Mixed, required: false },
    revertedByEventId: { type: Schema.Types.ObjectId, ref: 'MatchEvent', required: false },
    isReverted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export type MatchEventDocument = InferSchemaType<typeof matchEventSchema> & { _id: string };
export const MatchEventModel = model('MatchEvent', matchEventSchema);
