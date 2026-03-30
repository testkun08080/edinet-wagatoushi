---
name: Technical Assets Inventory
description: Current technical capabilities and architecture for monetization planning
type: project
---

Verified technical assets as of 2026-03-30:

- **47 financial columns** in screener_columns.json (basic, valuation, performance, balancesheet, cash categories)
- **Computed metrics**: PBR, PER, dividend yield, market cap, net cash ratio, ROE/ROA calculated, FCF, payout ratio
- **Pages**: index (screener table), analyze/@secCode (company detail with charts), contact, privacy
- **Components**: CompanyTable, SummaryCharts, MajorShareholdersTimeSeries, DataAttributionBlock, TableDownloadButton, ColumnVisibilityControls, FavoritesViewToggle
- **UI library**: 30 shadcn/ui components on Radix UI + Tailwind
- **State**: ColumnVisibilityContext, FavoritesContext, FilterContext, RecentCompaniesContext (all React Context)
- **Infra**: Cloudflare Workers via wrangler, Vike SSR, Sentry error monitoring
- **Static JSON architecture**: No backend API, data served from public/data/

**Why:** Need accurate understanding of what's built to assess monetization feasibility.

**How to apply:** Reference when estimating implementation effort for premium features. Key constraint: no dynamic backend API currently exists; authentication and user data require new infrastructure (D1/KV recommended).
