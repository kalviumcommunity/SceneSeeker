import express from "express";
import fs from "fs";
import OpenAI from "openai";

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

export default router;
