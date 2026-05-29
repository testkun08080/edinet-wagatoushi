/** Screener app root (company table) */
export const SCREENER = "/screener";

/** Company analyze page */
export function analyzePath(secCode: string): string {
  return `/screener/analyze/${secCode}`;
}

const DEFAULT_GITHUB_REPO = "https://github.com/testkun08080/edinet-wagatoushi";

export const GITHUB_REPO =
  (typeof import.meta.env.PUBLIC_ENV__GITHUB_REPO === "string" &&
    import.meta.env.PUBLIC_ENV__GITHUB_REPO) ||
  DEFAULT_GITHUB_REPO;
export const GITHUB_DOCS = `${GITHUB_REPO}/tree/main/docs`;
