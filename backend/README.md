# SceneSeeker Backend

Plain JavaScript (ES modules) Express + MongoDB + ChromaDB + OpenAI.

## Prerequisites

- Node.js **18+**
- MongoDB running locally or reachable via `MONGO_URI`
- ChromaDB running

### Start ChromaDB with Docker

```bash
docker run -p 8000:8000 --name chromadb ghcr.io/chroma-core/chroma:latest
```

## Install

```bash
cd backend
npm install
```

## Environment variables

1. Copy the example env:

```bash
cp .env.example .env
```

2. Edit `.env` and set at least:

- `MONGO_URI`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `TMDB_API_KEY` (Bearer token)
- `CHROMA_HOST`, `CHROMA_PORT`, `CHROMA_COLLECTION_NAME`

## Seed (required once)

This fetches popular movies/TV from TMDB, generates embeddings, upserts into ChromaDB, and upserts movies into Mongo.

```bash
npm run seed
```

## Run

Development (Node watch mode):

```bash
npm run dev
```

Production:

```bash
npm start
```

Server defaults to `http://localhost:5000` (or `PORT`).

## API

Base URL: `/api`

### Health

- **GET** `/health`
  - Auth: No
  - Response:
    - `200 { "status": "ok", "uptime": 12.34, "timestamp": "2026-01-01T00:00:00.000Z" }`

### Auth

- **POST** `/auth/register`
  - Auth: No
  - Body:
    ```json
    { "username": "alice", "email": "alice@example.com", "password": "password123" }
    ```
  - Response:
    ```json
    { "accessToken": "<jwt>" }
    ```
  - Notes: sets `refreshToken` cookie (httpOnly)

- **POST** `/auth/login`
  - Auth: No
  - Body:
    ```json
    { "username": "alice", "password": "password123" }
    ```
    or
    ```json
    { "email": "alice@example.com", "password": "password123" }
    ```
  - Response:
    ```json
    { "accessToken": "<jwt>" }
    ```

- **POST** `/auth/refresh`
  - Auth: No (uses cookie)
  - Cookies: `refreshToken`
  - Response:
    ```json
    { "accessToken": "<jwt>" }
    ```

- **POST** `/auth/logout`
  - Auth: No (uses cookie)
  - Response:
    ```json
    { "message": "Logged out" }
    ```

- **GET** `/auth/me`
  - Auth: Yes (`Authorization: Bearer <accessToken>`)
  - Response:
    ```json
    { "user": { "_id": "...", "username": "alice", "email": "alice@example.com" } }
    ```

### AI

- **POST** `/ai/ask`
  - Auth: No
  - Body:
    ```json
    { "query": "Explain the plot of Inception" }
    ```
  - Response:
    ```json
    { "answer": "..." }
    ```

- **POST** `/ai/search`
  - Auth: Yes
  - Body:
    ```json
    { "query": "A heist in a dream within a dream with a spinning top" }
    ```
  - Response:
    ```json
    {
      "data": [
        {
          "title": "Inception",
          "tmdbId": 27205,
          "type": "movie",
          "confidence": "High",
          "reason": "...",
          "related": [],
          "synopsis": "...",
          "posterUrl": "...",
          "releaseYear": 2010
        }
      ]
    }
    ```

- **GET** `/ai/suggest?q=<text>`
  - Auth: Yes
  - Response:
    ```json
    {
      "data": [
        { "title": "Inception", "tmdbId": 27205, "type": "movie", "posterUrl": "..." }
      ]
    }
    ```

### Movies

- **GET** `/movies`
  - Auth: No
  - Response:
    ```json
    { "data": [ { "tmdbId": 123, "title": "...", "type": "movie" } ] }
    ```

- **GET** `/movies/:tmdbId`
  - Auth: No
  - Response:
    ```json
    { "data": { "tmdbId": 123, "title": "...", "type": "movie", "synopsis": "..." } }
    ```

### History

- **GET** `/history?page=1&limit=10`
  - Auth: Yes
  - Response:
    ```json
    { "data": [], "page": 1, "limit": 10, "total": 0, "totalPages": 1 }
    ```

- **DELETE** `/history/:id`
  - Auth: Yes
  - Response:
    ```json
    { "message": "Deleted" }
    ```

- **DELETE** `/history`
  - Auth: Yes
  - Response:
    ```json
    { "deletedCount": 12 }
    ```
