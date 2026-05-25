/** Parse EDINET raw TSV JSON for major shareholders (大株主の状況). */

export type MajorShareholderEntry = {
  rank: number;
  name: string;
  address: string;
  shares: string | null;
  ratio: string | null;
};

const CTX_RANK = /No(\d+)MajorShareholdersMember$/;

function rankFromContext(contextId: string): number | null {
  const m = contextId.match(CTX_RANK);
  if (!m) return null;
  return parseInt(m[1], 10);
}

export function parseMajorShareholdersFromRaw(raw: { rows?: string[][] }): MajorShareholderEntry[] {
  const rows = raw.rows ?? [];
  type Acc = { rank: number; name?: string; address?: string; shares?: string; ratio?: string };
  const map = new Map<number, Acc>();

  for (const row of rows) {
    const elemId = row[0];
    const itemName = row[1] ?? "";
    const contextId = row[2] ?? "";
    const value = row[8] ?? "";

    const rank = rankFromContext(contextId);
    if (rank == null) continue;

    let acc = map.get(rank);
    if (!acc) {
      acc = { rank };
      map.set(rank, acc);
    }

    if (elemId === "jpcrp_cor:NameMajorShareholders") {
      acc.name = value;
    } else if (elemId === "jpcrp_cor:AddressMajorShareholders") {
      acc.address = value;
    } else if (
      elemId === "jpcrp_cor:NumberOfSharesHeld" &&
      itemName === "所有株式数" &&
      contextId.includes("MajorShareholders")
    ) {
      acc.shares = value;
    } else if (
      elemId === "jpcrp_cor:ShareholdingRatio" &&
      itemName === "発行済株式（自己株式を除く。）の総数に対する所有株式数の割合" &&
      contextId.includes("MajorShareholders")
    ) {
      acc.ratio = value;
    }
  }

  return Array.from(map.values())
    .filter((a): a is Acc & { name: string } => Boolean(a.name?.trim()))
    .sort((a, b) => a.rank - b.rank)
    .map((a) => ({
      rank: a.rank,
      name: a.name!.trim(),
      address: (a.address ?? "").trim(),
      shares: a.shares?.trim() && a.shares !== "－" ? a.shares.trim() : null,
      ratio: a.ratio?.trim() && a.ratio !== "－" ? a.ratio.trim() : null,
    }));
}

export function formatMajorShareholderCell(shares: string | null, ratio: string | null): string {
  const parts: string[] = [];
  if (shares) {
    const n = parseInt(shares.replace(/,/g, ""), 10);
    if (!isNaN(n)) {
      parts.push(`${(n / 1000).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}千株`);
    } else {
      parts.push(shares);
    }
  }
  if (ratio) {
    const r = parseFloat(ratio);
    if (!isNaN(r)) {
      parts.push(`(${((r <= 1 ? r : r / 100) * 100).toFixed(2)}%)`);
    } else {
      parts.push(`(${ratio})`);
    }
  }
  return parts.length ? parts.join(" ") : "―";
}
