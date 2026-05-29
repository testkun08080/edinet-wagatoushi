import type { Config } from "vike/types";
import vikePhoton from "vike-photon/config";
import vikeReact from "vike-react/config";
import { SITE_NAME } from "../lib/brand";

// Default config (can be overridden by pages)
// https://vike.dev/config

export default {
  // https://vike.dev/head-tags
  title: SITE_NAME,
  description: "EDINET財務データの検索・分析",

  extends: [vikeReact, vikePhoton],

  photon: {
    server: "../server/index.ts",
  },
} satisfies Config;
