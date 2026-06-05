import express from "express";
import fs from "fs";
import OpenAI from "openai";
import protect from "../middleware/auth.js";
import { search as ragSearch } from "../services/rag.service.js";
import SearchHistory from "../models/SearchHistory.js";
import Movie from "../models/Movie.js";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Example endpoint using system prompt
router.post("/ask", async (req, res) => {
  try {
    const { query } = req.body;
    const systemPrompt = fs.readFileSync("./prompts/system.txt", "utf8");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ]
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RAG search (protected)
router.post("/search", protect, async (req, res) => {
  try {
    const { query } = req.body;

    if (typeof query !== "string" || query.length < 10 || query.length > 500) {
      return res.status(400).json({ error: "query must be a string between 10 and 500 characters" });
    }

    const results = await ragSearch(query);

    // Save history in background (fire and forget)
    Promise.resolve(
      SearchHistory.create({
        userId: req.user,
        query,
        results: results.map((r) => ({
          title: r.title,
          tmdbId: r.tmdbId,
          type: r.type,
          confidence: r.confidence,
          reason: r.reason,
          synopsis: r.synopsis,
          posterUrl: r.posterUrl,
          releaseYear: r.releaseYear,
        })),
      })
    ).catch((err) => console.error("Failed to save search history:", err));

    return res.json({ data: results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Suggestions (protected)
router.get("/suggest", protect, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.status(400).json({ error: "q must be at least 2 characters" });

    const suggestions = await Movie.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(5)
      .select("title tmdbId type posterUrl");

    return res.json({ data: suggestions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
