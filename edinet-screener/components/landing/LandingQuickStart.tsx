import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { GITHUB_REPO } from "../../lib/routes";

export function LandingQuickStart() {
  return (
    <section className="px-4 py-20 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">クイックスタート</p>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">すぐに試せる</h2>
        <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-muted-foreground">
          Docker でサンプルデータ付きの環境を起動できます。
        </p>

        <Card className="mt-10 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">docker compose up</CardTitle>
            <CardDescription>
              ランディングページは <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/</code>
              、スクリーナーは <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/screener</code>{" "}
              です。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
              {`git clone ${GITHUB_REPO}.git
cd edinet-wagatoushi
docker compose up`}
            </pre>
            <p className="text-sm text-muted-foreground">
              <a
                href="http://localhost:3000"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                http://localhost:3000
              </a>{" "}
              で LP、
              <a
                href="http://localhost:3000/screener"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                /screener
              </a>{" "}
              でスクリーナーが開きます。
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">LP = /</Badge>
              <Badge variant="outline">App = /screener</Badge>
              <Badge variant="outline">MIT License</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
