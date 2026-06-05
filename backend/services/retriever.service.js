import { getCollection } from "./chroma.service.js";

export async function retrieveSimilarScenes(queryEmbedding, topK = 10) {
  const collection = await getCollection();

  const resp = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    include: ["documents", "metadatas", "distances"],
  });

  const ids = resp?.ids?.[0] || [];
  const documents = resp?.documents?.[0] || [];
  const metadatas = resp?.metadatas?.[0] || [];
  const distances = resp?.distances?.[0] || [];

  if (!ids.length) return [];

  return ids.map((id, i) => ({
    id,
    document: documents[i] ?? "",
    metadata: metadatas[i] ?? {},
    distance: distances[i],
  }));
}
