# packages/types — API/Web 共通 TS 型

`apps/api` が返し、`apps/web` が受け取る API レスポンスのドメイン型。

パッケージ名: `@edinet/types`

## ファイル構成

```
packages/types/
└── src/index.ts    全型を定義
```

## 主な型

| 型 | 用途 |
|---|---|
| `Company` | 企業 1 件 |
| `CompanyListResponse` | `/api/companies` |
| `PeriodFinancialView` / `FinancialBlock` | `/api/summaries` の 1 期 |
| `SummaryResponse` | `/api/summaries/:secCode` |
| `MetricsRow` / `MetricsResponse` | `/api/metrics` |
| `ColumnDefinition` | カラム定義（manifest / metrics 共通） |
| `SearchResult` / `SearchResponse` | `/api/search` |
| `ShareholderEntry` / `ShareholderSnapshot` / `ShareholdersResponse` | `/api/shareholders` |
| `ManifestResponse` | `/api/manifest` |
| `HealthResponse` | `/api/health` |

## 位置づけ

- `@edinet/db` の drizzle 推論型は **DB 行**の形（snake_case 由来の camelCase）。
- `@edinet/types` は **API 公開契約**の形。両者は別物として保つ（API が DB スキーマ変更から UI を遮蔽する）。
- ランタイムコードを持たない純粋な型定義パッケージ。

## 使用例

```ts
// apps/api/src/routes/companies.ts
import type { CompanyListResponse } from "@edinet/types";

// apps/web — 多くは hc<AppType> の推論経由で受けるため直接 import は最小限
```
