import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function safeJsonParseArray(text) {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function rankAndExplain(userQuery, candidates) {
  try {
    const list = (candidates || []).slice(0, 20).map((c, idx) => ({
      n: idx + 1,
      title: c.title,
      tmdbId: c.tmdbId,
      type: c.type,
      synopsis: c.synopsis,
    }));

    const prompt =
      "You are a movie/TV scene matcher. " +
      "Given a user query and candidate titles/synopses, pick the best matches. " +
      "Return ONLY a JSON array (no markdown, no extra text) of 3 to 5 results. " +
      "Each result must have: title, tmdbId, confidence (High|Medium|Low), reason, related (array).\n\n" +
      `User query: ${userQuery}\n\n` +
      `Candidates: ${JSON.stringify(list)}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeJsonParseArray(raw);
    if (parsed) return parsed;

    const sliced = (candidates || []).slice(0, 3);
    return sliced.map((c) => ({
      title: c.title,
      tmdbId: c.tmdbId,
      confidence: "Medium",
      reason: "Closest match from retrieved candidates.",
      related: [],
    }));
  } catch (err) {
    console.error("rankAndExplain error:", err);

    const sliced = (candidates || []).slice(0, 3);
    return sliced.map((c) => ({
      title: c.title,
      tmdbId: c.tmdbId,
      confidence: "Medium",
      reason: "Closest match from retrieved candidates.",
      related: [],
    }));
  }
}
