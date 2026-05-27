import { Schema, model, type InferSchemaType } from 'mongoose';

const scoringFormatSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['padel_best_of_3_double_advantage'],
      default: 'padel_best_of_3_double_advantage'
    }
  },
  { _id: false }
);

const tournamentSchema = new Schema(
  {
    name: { type: String, required: true },
    format: { type: String, enum: ['single_elimination'], default: 'single_elimination' },
    status: {
      type: String,
      enum: ['draft', 'ready', 'live', 'finished', 'archived'],
      default: 'draft'
    },
    startsAt: { type: Date, required: false },
    scoringFormat: { type: scoringFormatSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export type TournamentDocument = InferSchemaType<typeof tournamentSchema> & { _id: string };
export const TournamentModel = model('Tournament', tournamentSchema);
