import {
  DOCUMENTED_EDINET_ENDPOINTS,
  EDINET_API_BASE,
  LICENSE_AND_GUIDELINES,
  RUNTIME_STATIC_DATA_PATHS,
} from "@/lib/data-attribution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";

export function DataAttributionBlock({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={compact ? "border-dashed" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">データの出典・履歴</CardTitle>
        <CardDescription>
          本サービスの数値・表は、金融庁 EDINET
          において開示された情報等をもとに加工したものです。二次利用・表示にあたっては、各ライセンスおよび EDINET
          の注意事項に従ってください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="font-medium text-foreground mb-2">ライセンス・ガイドライン</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <a
                href={LICENSE_AND_GUIDELINES.pdm.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {LICENSE_AND_GUIDELINES.pdm.label}
              </a>
            </li>
            <li>
              <a
                href={LICENSE_AND_GUIDELINES.disclosure2Guide.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {LICENSE_AND_GUIDELINES.disclosure2Guide.label}
              </a>
            </li>
            <li>
              <a
                href={LICENSE_AND_GUIDELINES.edinetPortal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {LICENSE_AND_GUIDELINES.edinetPortal.label}
              </a>
            </li>
          </ul>
        </div>
        <Separator />
        <div>
          <p className="font-medium text-foreground mb-2">データ生成時に想定される EDINET Web API（例）</p>
          <p className="text-muted-foreground text-xs mb-2">
            ベース URL: <code className="rounded bg-muted px-1 py-0.5 text-xs">{EDINET_API_BASE}</code>
          </p>
          <ul className="space-y-2">
            {DOCUMENTED_EDINET_ENDPOINTS.map((e) => (
              <li key={e.path} className="rounded-md border bg-muted/30 p-2">
                <div className="font-mono text-xs break-all">
                  <span className="text-muted-foreground">{e.method}</span> {e.fullUrlExample}
                </div>
                <p className="text-muted-foreground text-xs mt-1">{e.description}</p>
              </li>
            ))}
          </ul>
        </div>
        {!compact && (
          <>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-2">本サイト実行時にブラウザが取得するデータ（静的 JSON）</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                {RUNTIME_STATIC_DATA_PATHS.map((r) => (
                  <li key={r.path}>
                    <code className="rounded bg-muted px-1">{r.path}</code> — {r.description}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
