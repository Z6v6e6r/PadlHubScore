import { Schema, model, type InferSchemaType } from 'mongoose';

const courtSchema = new Schema(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    name: { type: String, required: true },
    number: { type: Number, required: true },
    stationName: { type: String, required: false },
    status: {
      type: String,
      enum: ['available', 'busy', 'paused', 'disabled'],
      default: 'available'
    }
  },
  { timestamps: true }
);

export type CourtDocument = InferSchemaType<typeof courtSchema> & { _id: string };
export const CourtModel = model('Court', courtSchema);
