import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text) {
  try {
    const input = String(text ?? "").slice(0, 8000);

    const resp = await client.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });

    return resp.data?.[0]?.embedding || [];
  } catch (err) {
    console.error("generateEmbedding error:", err);
    throw err;
  }
}

export async function generateBatchEmbeddings(textsArray) {
  try {
    const texts = Array.isArray(textsArray) ? textsArray : [];
    const batches = [];

    for (let i = 0; i < texts.length; i += 100) {
      batches.push(texts.slice(i, i + 100));
    }

    const allEmbeddings = [];

    for (const batch of batches) {
      const input = batch.map((t) => String(t ?? "").slice(0, 8000));

      const resp = await client.embeddings.create({
        model: "text-embedding-3-small",
        input,
      });

      const embeddings = (resp.data || []).map((d) => d.embedding);
      allEmbeddings.push(...embeddings);
    }

    return allEmbeddings;
  } catch (err) {
    console.error("generateBatchEmbeddings error:", err);
    throw err;
  }
}
