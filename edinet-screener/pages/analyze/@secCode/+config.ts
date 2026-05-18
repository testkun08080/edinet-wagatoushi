import type { Config } from "vike/types";
import { SITE_NAME } from "../../../lib/brand";

export default {
  // ページタイトルは +data.ts で動的に設定
  title: `企業分析 - ${SITE_NAME}`,
} satisfies Config;
