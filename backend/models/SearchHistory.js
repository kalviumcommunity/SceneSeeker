import mongoose from "mongoose";

const searchResultSchema = new mongoose.Schema(
  {
    title: { type: String },
    tmdbId: { type: Number },
    type: { type: String },
    confidence: { type: Number },
    reason: { type: String },
    synopsis: { type: String },
    posterUrl: { type: String },
    releaseYear: { type: Number },
  },
  { _id: false }
);

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    query: { type: String, required: true, maxlength: 500 },
    results: { type: [searchResultSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

searchHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("SearchHistory", searchHistorySchema);
