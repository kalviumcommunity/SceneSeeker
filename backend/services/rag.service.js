import { generateEmbedding } from "./embedding.service.js";
import { retrieveSimilarScenes } from "./retriever.service.js";
import { rankAndExplain } from "./llm.service.js";
import Movie from "../models/Movie.js";
import { getMovieDetails, getTVDetails } from "./tmdb.service.js";

function dedupeByTmdbId(items) {
  const map = new Map();

  for (const item of items) {
    const tmdbId = Number(item?.metadata?.tmdbId);
    if (!tmdbId) continue;

    const prev = map.get(tmdbId);
    if (!prev || (typeof item.distance === "number" && item.distance < prev.distance)) {
      map.set(tmdbId, item);
    }
  }

  return Array.from(map.values());
}

async function enrichFromDbOrTmdb(tmdbId, type) {
  const fromDb = await Movie.findOne({ tmdbId });
  if (fromDb) return fromDb;

  let normalized = null;
  if (type === "tv") normalized = await getTVDetails(tmdbId);
  else normalized = await getMovieDetails(tmdbId);

  if (!normalized) return null;

  return await Movie.findOneAndUpdate(
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
}

export async function search(userQuery) {
  const start = Date.now();

  const embedding = await generateEmbedding(userQuery);
  const retrieved = await retrieveSimilarScenes(embedding, 10);

  const deduped = dedupeByTmdbId(retrieved);

  const candidates = deduped.map((r) => ({
    tmdbId: Number(r?.metadata?.tmdbId),
    title: r?.metadata?.title || "",
    type: r?.metadata?.type || "movie",
    synopsis: r?.metadata?.synopsis || r?.document || "",
    distance: r?.distance,
    metadata: r?.metadata || {},
  }));

  const ranked = await rankAndExplain(userQuery, candidates);

  const enriched = [];
  for (const r of (ranked || []).slice(0, 5)) {
    const tmdbId = Number(r?.tmdbId);
    if (!tmdbId) continue;

    const candidate = candidates.find((c) => c.tmdbId === tmdbId);
    const type = r?.type || candidate?.type || "movie";

    let movieDoc = null;
    try {
      movieDoc = await enrichFromDbOrTmdb(tmdbId, type);
    } catch (err) {
      movieDoc = null;
    }

    enriched.push({
      title: r.title || movieDoc?.title || candidate?.title,
      tmdbId,
      type: movieDoc?.type || type,
      confidence: r.confidence || "Medium",
      reason: r.reason || "",
      related: Array.isArray(r.related) ? r.related : [],
      synopsis: movieDoc?.synopsis || candidate?.synopsis || "",
      posterUrl: movieDoc?.posterUrl || candidate?.metadata?.posterUrl,
      releaseYear: movieDoc?.releaseYear || candidate?.metadata?.releaseYear,
    });
  }

  console.log(`[RAG] search took ${Date.now() - start}ms`);
  return enriched;
}
