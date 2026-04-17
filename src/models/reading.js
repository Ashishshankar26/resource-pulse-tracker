import mongoose from "mongoose";

const readingSchema = new mongoose.Schema(
  {
    resourceType: {
      type: String,
      enum: ["water", "electricity"],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    recordedAt: {
      type: Date,
      required: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

readingSchema.index({ recordedAt: -1 });

export const Reading =
  mongoose.models.Reading || mongoose.model("Reading", readingSchema);
