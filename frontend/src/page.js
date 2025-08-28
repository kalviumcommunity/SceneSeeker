"use client";
import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");

  const askAI = async () => {
    const res = await axios.post("http://localhost:5000/api/ai/ask", { query });
    setAnswer(res.data.answer);
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">🎬 SceneSeeker AI</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border p-2 mr-2"
        placeholder="Describe a movie scene..."
      />
      <button onClick={askAI} className="bg-blue-500 text-white px-4 py-2 rounded">
        Search
      </button>
      <p className="mt-4">{answer}</p>
    </div>
  );
}
