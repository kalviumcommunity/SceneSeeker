<h2 align="center"> SceneSeeker AI</h2>  
<p align="center"><i>“Can’t recall the name, but there was a scene where a woman walks alone in the rain, and everything is blue...”</i><br>Let AI do the guessing.</p>

---

## Overview

**SceneSeeker AI** is an AI assistant that identifies movies/TV shows based on vague scene descriptions using **RAG (Retrieval-Augmented Generation)** and **LLMs**. It bridges the gap between fuzzy memory and accurate title recognition using smart retrieval and generative intelligence.

---

## Problem Statement

People often remember **just a scene**, not the title:

> “There’s a train fight and the guy wears red and black…”

Search engines fail at such queries. SceneSeeker AI interprets this ambiguity and retrieves the most likely movie/show matches using semantic search + LLM.

---

### ➤ Output:
- Top 3–5 results containing:
  - 🎬 Title  
  - ✅ Confidence score  
  - 📝 Short synopsis  
  - 🖼️ Optional thumbnail

---

## System Architecture

### RAG Pipeline

1. **Retriever**  
   - Converts the user query into embeddings  
   - Searches a vector DB (e.g. FAISS, Chroma) for similar scene summaries

2. **Generator**  
   - Takes the top matches as context  
   - Uses an LLM (e.g. GPT-4, Mistral, Claude) to rank and summarize potential answers

3. **Post-Processor**  
   - Sorts results by relevance score  
   - Returns clean, structured output

---

## Tech Stack

| Layer         | Tool/Tech                      |
|--------------|--------------------------------|
| Frontend      | React / Next.js (optional UI)  |
| Backend       | FastAPI / Flask                |
| Embeddings    | OpenAI / HuggingFace / Cohere  |
| Vector DB     | FAISS / Chroma                 |
| LLM           | GPT-4 / Claude / Mixtral       |
| Storage       | JSON / MongoDB (optional)      |

---

## Example Queries

> _“The movie where a guy writes letters to his past self using a mailbox”_  
> _“The animated film with emotions as characters in a girl’s head”_  
> _“A detective with amnesia wakes up with tattoos all over his body”_

---
## Use Case Example

**User Input:**

> “I remember this movie where a woman gets letters from a man living in a different year. They meet through a mailbox, I think?”

**AI Output:**

```json
{
  "guess": "The Lake House",
  "confidence": "High",
  "reason": "The Lake House features time-travel letters exchanged via a mailbox and stars Sandra Bullock.",
  "related": ["Your Name", "The Time Traveler's Wife", "About Time"]
}
