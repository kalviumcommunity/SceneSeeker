import dotenv from "dotenv";
import mongoose from "mongoose";

import { getPopularMovies, getPopularTV } from "../services/tmdb.service.js";
import { generateBatchEmbeddings } from "../services/embedding.service.js";
import { getCollection } from "../services/chroma.service.js";
import Movie from "../models/Movie.js";

dotenv.config();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildSceneDescriptions(item) {
  const title = item.title || "";
  const year = item.releaseYear || "";
  const type = item.type || "movie";
  const synopsis = item.synopsis || "";
  const genres = Array.isArray(item.genres) ? item.genres : [];

  const templateA = `${title} (${year}) - ${type}: ${synopsis}. Genres: ${genres.join(", ")}.`;

  const mainGenre = genres[0] || "";
  const shortSynopsis = synopsis.slice(0, 120);
  const templateB = `A ${mainGenre} ${type} titled ${title}: ${shortSynopsis}...`;

  return [templateA, templateB];
}

function toMetadata(item) {
  const genres = Array.isArray(item.genres) ? item.genres : [];

  return {
    tmdbId: item.tmdbId,
    title: item.title,
    type: item.type,
    synopsis: item.synopsis,
    posterUrl: item.posterUrl,
    releaseYear: item.releaseYear,
    genres: genres.join(","),
  };
}

async function fetchCatalog() {
  const items = [];

  for (let page = 1; page <= 10; page += 1) {
    const [movies, tv] = await Promise.all([
      getPopularMovies(page),
      getPopularTV(page),
    ]);

    items.push(...(movies || []));
    items.push(...(tv || []));
  }

  return items;
}

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI is not set");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);

  console.log("Connecting to ChromaDB...");
  const collection = await getCollection();

  console.log("Fetching popular movies/TV from TMDB...");
  const items = await fetchCatalog();

  // 10 pages movies + 10 pages tv = ~400 items (20 * 20)
  // We'll log progress as we go.
  let processed = 0;
  let seeded = 0;

  const bulkOps = [];

  // Build all docs first so we can embed in clean batches of 20 titles
  const titleBatches = [];
  for (let i = 0; i < items.length; i += 20) {
    titleBatches.push(items.slice(i, i + 20));
  }

  for (const batchItems of titleBatches) {
    const texts = [];
    const chromaIds = [];
    const chromaMetas = [];
    const chromaDocs = [];

    for (const item of batchItems) {
      processed += 1;

      try {
        const [docA, docB] = buildSceneDescriptions(item);

        const idA = `tmdb_${item.tmdbId}_0`;
        const idB = `tmdb_${item.tmdbId}_1`;
        const meta = toMetadata(item);

        texts.push(docA, docB);
        chromaIds.push(idA, idB);
        chromaDocs.push(docA, docB);
        chromaMetas.push(meta, meta);

        bulkOps.push({
          updateOne: {
            filter: { tmdbId: item.tmdbId },
            update: {
              $set: {
                tmdbId: item.tmdbId,
                title: item.title,
                type: item.type,
                synopsis: item.synopsis,
                genres: item.genres,
                releaseYear: item.releaseYear,
                posterUrl: item.posterUrl,
              },
            },
            upsert: true,
          },
        });

        seeded += 1;
        if (seeded % 10 === 0) {
          console.log(`Seeded ${seeded}/${items.length}: ${item.title}`);
        }
      } catch (err) {
        console.error(`Skipping tmdbId=${item?.tmdbId} due to error:`, err);
        continue;
      }
    }

    // Generate embeddings for the 2 docs per title
    try {
      const embeddings = await generateBatchEmbeddings(texts);

      await collection.upsert({
        ids: chromaIds,
        documents: chromaDocs,
        metadatas: chromaMetas,
        embeddings,
      });
    } catch (err) {
      console.error("Embedding/Chroma upsert batch failed (skipping batch):", err);
    }

    // 1 second delay to avoid rate limits
    await delay(1000);
  }

  console.log("Upserting movies into MongoDB...");
  if (bulkOps.length) {
    await Movie.bulkWrite(bulkOps, { ordered: false });
  }

  console.log("Done.");

  console.log("Disconnecting...");
  await mongoose.disconnect();
  // chromadb client is http-based; nothing explicit to close
}

seed().catch(async (err) => {
  console.error("Seeding failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
