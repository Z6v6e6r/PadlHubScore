import { Schema, model, type InferSchemaType } from 'mongoose';

const teamSchema = new Schema(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    player1Name: { type: String, required: true },
    player2Name: { type: String, required: true },
    displayName: { type: String, required: false },
    seed: { type: Number, required: false },
    status: { type: String, enum: ['active', 'withdrawn'], default: 'active' }
  },
  { timestamps: true }
);

export type TeamDocument = InferSchemaType<typeof teamSchema> & { _id: string };
export const TeamModel = model('Team', teamSchema);
