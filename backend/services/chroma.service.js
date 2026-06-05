import { ChromaClient } from "chromadb";

let collectionPromise;

function getClient() {
  const host = process.env.CHROMA_HOST || "localhost";
  const port = process.env.CHROMA_PORT || "8000";

  return new ChromaClient({
    path: `http://${host}:${port}`,
  });
}

export async function getCollection() {
  if (collectionPromise) return collectionPromise;

  collectionPromise = (async () => {
    const client = getClient();
    const name = process.env.CHROMA_COLLECTION_NAME;

    if (!name) {
      throw new Error("CHROMA_COLLECTION_NAME is not set");
    }

    try {
      return await client.getCollection({ name });
    } catch (err) {
      return await client.createCollection({ name });
    }
  })();

  return collectionPromise;
}
