"use client";

import { useEffect } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { analyzePath } from "../../../lib/routes";

/** Legacy /analyze/:secCode → /screener/analyze/:secCode */
export default function Page() {
  const pageContext = usePageContext();
  const secCode = pageContext.routeParams?.secCode as string | undefined;

  useEffect(() => {
    if (secCode) {
      void navigate(analyzePath(secCode), { overwriteLastHistoryEntry: true });
    }
  }, [secCode]);

  return null;
}
