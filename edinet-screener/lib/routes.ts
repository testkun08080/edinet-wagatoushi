/** Screener app root (company table) */
export const SCREENER = "/screener";

/** Company analyze page */
export function analyzePath(secCode: string): string {
  return `/screener/analyze/${secCode}`;
}

export const GITHUB_REPO = "https://github.com/testkun08080/edinet-wagatoushi";
export const GITHUB_DOCS = `${GITHUB_REPO}/tree/main/docs`;
