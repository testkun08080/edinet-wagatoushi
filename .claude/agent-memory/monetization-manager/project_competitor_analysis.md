---
name: Japanese Financial Data Competitor Analysis
description: Competitor landscape for financial screener tools in Japan with pricing and differentiation
type: project
---

Competitor analysis as of 2026-03-30:

| Service | Strengths | Weaknesses | Pricing |
|---|---|---|---|
| Yahoo! Finance JP | Massive user base, real-time prices | Limited screening, no EDINET raw data | Free (ad-supported) |
| Buffett Code | Strong financial analysis UI | Expensive (4,980+ JPY/mo), solo dev | Freemium |
| Monex Scout | Broker integration | Requires Monex account | Free (with account) |
| Kabutan | Speed, earnings reports | Weak screening | Free + premium |
| IR BANK | EDINET/TDNET linked | Dated UI, limited analysis | Free |

**Our differentiation:**
1. Direct EDINET raw data parsing (transparent, verifiable)
2. Open-source calculation logic
3. 47-column comprehensive screening with computed metrics
4. Ultra-low operating cost via Cloudflare Workers (~5,000 JPY/month)

**Why:** Understanding competitive landscape is essential for positioning and pricing decisions.

**How to apply:** When designing premium features, focus on gaps competitors don't fill: transparent calculations, comprehensive computed metrics, EDINET direct data. Avoid competing on real-time stock prices (Yahoo/brokers dominate there).
