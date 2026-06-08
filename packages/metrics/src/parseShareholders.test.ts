import { describe, expect, it } from "vitest";
import {
  majorShareholdersToApiEntries,
  parseMajorShareholdersFromRaw,
} from "./parseShareholders.js";

const tsvFixture = {
  rows: [
    [
      "jpcrp_cor:NameMajorShareholders",
      "氏名又は名称",
      "No1MajorShareholdersMember",
      "",
      "",
      "",
      "",
      "",
      "サンプルホールディングス株式会社",
    ],
    [
      "jpcrp_cor:AddressMajorShareholders",
      "住所",
      "No1MajorShareholdersMember",
      "",
      "",
      "",
      "",
      "",
      "東京都千代田区",
    ],
    [
      "jpcrp_cor:NumberOfSharesHeld",
      "所有株式数",
      "No1MajorShareholdersMember",
      "",
      "",
      "",
      "",
      "",
      "128,600,000",
    ],
    [
      "jpcrp_cor:ShareholdingRatio",
      "発行済株式（自己株式を除く。）の総数に対する所有株式数の割合",
      "No1MajorShareholdersMember",
      "",
      "",
      "",
      "",
      "",
      "29.91",
    ],
    [
      "jpcrp_cor:NameMajorShareholders",
      "氏名又は名称",
      "No2MajorShareholdersMember",
      "",
      "",
      "",
      "",
      "",
      "日本サンプル年金基金",
    ],
    [
      "jpcrp_cor:NumberOfSharesHeld",
      "所有株式数",
      "No2MajorShareholdersMember",
      "",
      "",
      "",
      "",
      "",
      "43,000,000",
    ],
    [
      "jpcrp_cor:ShareholdingRatio",
      "発行済株式（自己株式を除く。）の総数に対する所有株式数の割合",
      "No2MajorShareholdersMember",
      "",
      "",
      "",
      "",
      "",
      "10.00",
    ],
  ],
};

describe("parseMajorShareholdersFromRaw", () => {
  it("parses ranked shareholder entries from TSV rows", () => {
    const entries = parseMajorShareholdersFromRaw(tsvFixture);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      rank: 1,
      name: "サンプルホールディングス株式会社",
      shares: "128,600,000",
      ratio: "29.91",
    });
    expect(entries[1]?.name).toBe("日本サンプル年金基金");
  });

  it("converts parsed entries to API shape", () => {
    const entries = parseMajorShareholdersFromRaw(tsvFixture);
    const apiEntries = majorShareholdersToApiEntries(entries);
    expect(apiEntries[0]).toEqual({
      name: "サンプルホールディングス株式会社",
      shares: 128600000,
      ratio: 0.2991,
    });
    expect(apiEntries[1]?.ratio).toBe(0.1);
  });
});
