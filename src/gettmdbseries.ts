import axios, { AxiosError } from "axios";
import https from "https";

export async function getTvTmdbResultsWithRetry(seriesName: string): Promise<any[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not set in environment variables.");
  }

  const tmdbUrl = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(seriesName)}`;

  const maxAttempts = 3;
  const delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(tmdbUrl, {
        timeout: 5000,
        httpsAgent: new https.Agent({ keepAlive: false }),
      });
      return response.data.results || [];
    } catch (error) {
      const err = error as AxiosError;
      if (err.code === "ECONNRESET" && attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }
      console.error(`[TMDB] TV search attempt ${attempt} failed:`, err.message);
      throw err;
    }
  }

  return [];
}

export async function getEpisodeDetails(
  seriesId: number, seasonNumber: number, episodeNumber: number
) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not set");
  const url = `https://api.themoviedb.org/3/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${apiKey}`;
  const maxAttempts = 3;
  const delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await axios.get(url, {
        timeout: 5000,
        httpsAgent: new https.Agent({ keepAlive: false }),
      });
      console.log(resp.data)
      return resp.data;
    } catch (error) {
      const err = error as AxiosError;
      if (err.code === "ECONNRESET" && attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }
      console.error(`[TMDB] Episode details attempt ${attempt} failed:`, err.message);
      throw err;
    }
  }
  throw new Error("Failed to fetch episode details after 3 attempts");
}