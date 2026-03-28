// https://vike.dev/data

import type { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";
import type { MovieDetails } from "../types.js";

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

export async function data(pageContext: PageContextServer) {
  // https://vike.dev/useConfig
  const config = useConfig();

  const timeoutMs = 2500;
  const response = await fetchWithTimeout(
    `https://brillout.github.io/star-wars/api/films/${pageContext.routeParams.id}.json`,
    timeoutMs,
  );
  let movie = (await response.json()) as MovieDetails;

  config({
    // Set <title>
    title: movie.title,
  });

  // We remove data we don't need because the data is passed to
  // the client; we should minimize what is sent over the network.
  movie = minimize(movie);

  return { movie };
}

function minimize(movie: MovieDetails): MovieDetails {
  const { id, title, release_date, director, producer } = movie;
  return { id, title, release_date, director, producer };
}
