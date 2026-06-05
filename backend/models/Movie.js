import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["movie", "tv"] },
    synopsis: { type: String },
    genres: [{ type: String }],
    releaseYear: { type: Number },
    posterUrl: { type: String },
    sceneDescriptions: [{ type: String }],
  },
  { timestamps: true }
);

// Text index for search suggestions
movieSchema.index({ title: "text", synopsis: "text" });

export default mongoose.model("Movie", movieSchema);
