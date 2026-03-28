// https://vike.dev/data

import { useConfig } from "vike-react/useConfig";
import type { Movie, MovieDetails } from "../types.js";

export type Data = Awaited<ReturnType<typeof data>>;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function data() {
  // https://vike.dev/useConfig
  const config = useConfig();

  const timeoutMs = 2500;
  const response = await fetchWithTimeout("https://brillout.github.io/star-wars/api/films.json", timeoutMs);
  const moviesData = (await response.json()) as MovieDetails[];

  config({
    // Set <title>
    title: `${moviesData.length} Star Wars Movies`,
  });

  // We remove data we don't need because the data is passed to the client; we should
  // minimize what is sent over the network.
  const movies = minimize(moviesData);

  return { movies };
}

function minimize(movies: MovieDetails[]): Movie[] {
  return movies.map((movie) => {
    const { title, release_date, id } = movie;
    return { title, release_date, id };
  });
}
