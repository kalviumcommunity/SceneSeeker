import express from "express";
import Movie from "../models/Movie.js";
import { getTrending, getMovieDetails, getTVDetails } from "../services/tmdb.service.js";

const router = express.Router();

// GET / - public trending (top 10)
router.get("/", async (req, res) => {
  try {
    const data = await getTrending();
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /:tmdbId - public movie/tv details (cache in Mongo)
router.get("/:tmdbId", async (req, res) => {
  try {
    const tmdbId = parseInt(req.params.tmdbId, 10);
    if (Number.isNaN(tmdbId)) {
      return res.status(400).json({ error: "tmdbId must be an integer" });
    }

    const existing = await Movie.findOne({ tmdbId });
    if (existing) {
      return res.json({ data: existing });
    }

    // Try both movie and tv
    let normalized = null;
    try {
      normalized = await getMovieDetails(tmdbId);
    } catch (err) {
      normalized = null;
    }

    if (!normalized) {
      try {
        normalized = await getTVDetails(tmdbId);
      } catch (err) {
        normalized = null;
      }
    }

    if (!normalized) {
      return res.status(404).json({ error: "Not found" });
    }

    const upserted = await Movie.findOneAndUpdate(
      { tmdbId: normalized.tmdbId },
      {
        $set: {
          tmdbId: normalized.tmdbId,
          title: normalized.title,
          type: normalized.type,
          synopsis: normalized.synopsis,
          releaseYear: normalized.releaseYear,
          genres: normalized.genres,
          posterUrl: normalized.posterUrl,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ data: upserted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
