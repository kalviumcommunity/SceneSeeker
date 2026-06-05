import axios from "axios";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

const tmdb = axios.create({
  baseURL: TMDB_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
  },
});

export function buildPosterUrl(posterPath) {
  if (!posterPath) return "placeholder";
  return `${TMDB_IMAGE_BASE_URL}/w500${posterPath}`;
}

function normalizeTMDBItem(item, type) {
  if (!item) return null;

  const title = type === "tv" ? item.name : item.title;
  const date = type === "tv" ? item.first_air_date : item.release_date;
  const releaseYear = date ? Number(String(date).slice(0, 4)) : undefined;

  return {
    tmdbId: item.id,
    title,
    type,
    synopsis: item.overview || "",
    releaseYear,
    genres: Array.isArray(item.genres)
      ? item.genres.map((g) => g.name).filter(Boolean)
      : Array.isArray(item.genre_ids)
        ? item.genre_ids.map(String)
        : [],
    posterUrl: buildPosterUrl(item.poster_path),
  };
}

export async function getMovieDetails(tmdbId) {
  const { data } = await tmdb.get(`/movie/${tmdbId}`);
  return normalizeTMDBItem(data, "movie");
}

export async function getTVDetails(tmdbId) {
  const { data } = await tmdb.get(`/tv/${tmdbId}`);
  return normalizeTMDBItem(data, "tv");
}

export async function searchByTitle(title, type = "movie") {
  if (!title) return null;

  const endpoint = type === "tv" ? "/search/tv" : "/search/movie";
  const { data } = await tmdb.get(endpoint, {
    params: {
      query: title,
      include_adult: false,
      language: "en-US",
      page: 1,
    },
  });

  const first = data?.results?.[0];
  return first ? normalizeTMDBItem(first, type) : null;
}

export async function getPopularMovies(page = 1) {
  const { data } = await tmdb.get("/movie/popular", {
    params: { page, language: "en-US" },
  });

  return (data?.results || []).map((item) => normalizeTMDBItem(item, "movie"));
}

export async function getPopularTV(page = 1) {
  const { data } = await tmdb.get("/tv/popular", {
    params: { page, language: "en-US" },
  });

  return (data?.results || []).map((item) => normalizeTMDBItem(item, "tv"));
}

export async function getTrending() {
  const { data } = await tmdb.get("/trending/all/week", {
    params: { language: "en-US" },
  });

  const results = (data?.results || []).slice(0, 10);

  return results
    .map((item) => {
      const inferredType = item?.media_type === "tv" ? "tv" : "movie";
      return normalizeTMDBItem(item, inferredType);
    })
    .filter(Boolean);
}
