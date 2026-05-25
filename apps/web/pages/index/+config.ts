import type { Config } from "vike/types";
import { SITE_NAME, SITE_OG_DESCRIPTION } from "../../lib/brand";

export default {
  title: `${SITE_NAME} — オープンソース EDINET スクリーナー`,
  description: SITE_OG_DESCRIPTION,
} satisfies Config;
