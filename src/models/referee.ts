import { Schema, model, type InferSchemaType } from 'mongoose';

const refereeSchema = new Schema(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    name: { type: String, required: true },
    login: { type: String, required: false },
    passwordHash: { type: String, required: false },
    accessTokenHash: { type: String, required: true, index: true },
    pinHash: { type: String, required: false },
    assignedCourtIds: [{ type: Schema.Types.ObjectId, ref: 'Court' }],
    assignedMatchIds: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    lastSeenAt: { type: Date, required: false }
  },
  { timestamps: true }
);

export type RefereeDocument = InferSchemaType<typeof refereeSchema> & { _id: string };
export const RefereeModel = model('Referee', refereeSchema);
