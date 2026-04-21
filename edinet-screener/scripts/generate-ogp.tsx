import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const WIDTH = 1200;
const HEIGHT = 630;

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const outputPath = resolve(rootDir, "public", "og-image.png");

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${WIDTH}" y2="${HEIGHT}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0B1736" />
      <stop offset="1" stop-color="#1E3A8A" />
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#60A5FA" stop-opacity="0.5" />
      <stop offset="1" stop-color="#22D3EE" stop-opacity="0.5" />
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" rx="24" fill="url(#bg)" />

  <g opacity="0.28" stroke="url(#line)" stroke-width="2">
    <path d="M90 500 L240 430 L390 460 L540 320 L690 360 L840 250 L990 300 L1110 210" />
    <path d="M90 540 L260 480 L410 500 L560 390 L710 420 L860 330 L1010 360 L1110 300" />
  </g>

  <g opacity="0.18" stroke="#93C5FD" stroke-width="1">
    <line x1="80" y1="100" x2="1120" y2="100" />
    <line x1="80" y1="190" x2="1120" y2="190" />
    <line x1="80" y1="280" x2="1120" y2="280" />
    <line x1="80" y1="370" x2="1120" y2="370" />
    <line x1="80" y1="460" x2="1120" y2="460" />
  </g>

  <rect x="930" y="56" width="210" height="52" rx="26" fill="#0EA5E9" fill-opacity="0.22" />
  <text x="1035" y="89" text-anchor="middle" font-size="24" fill="#E0F2FE" font-family="sans-serif">無料Webツール</text>

  <text x="88" y="275" font-size="84" font-weight="700" fill="#F8FAFC" font-family="sans-serif">EDINET財務スクリーナー</text>
  <text x="88" y="348" font-size="42" fill="#BFDBFE" font-family="sans-serif">有価証券報告書を10年分、検索・分析</text>

  <text x="88" y="562" font-size="28" fill="#93C5FD" font-family="sans-serif">edinet-wagatoushi</text>
</svg>
`;

const resvg = new Resvg(svg, {
  fitTo: {
    mode: "width",
    value: WIDTH,
  },
});

const pngBuffer = resvg.render().asPng();
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, pngBuffer);

console.log(`Generated: ${outputPath}`);
