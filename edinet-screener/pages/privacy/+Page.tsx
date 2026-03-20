import { DataAttributionBlock } from "../../components/DataAttributionBlock";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-auto p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">プライバシーポリシー</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          本ポリシーは、本サービス（エディー / EDINET スクリーナー）における個人情報・端末情報の取り扱い、および EDINET
          等の開示データを利用する際の留意点を説明します。法令改正やサービス内容の変更に応じて改定される場合があります。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. EDINET データの利用について</CardTitle>
          <CardDescription>
            金融庁が提供する EDINET（Electronic Disclosure for Investors&apos;
            NETwork）の開示情報をもとに、本サービス上で数値・表・グラフ等を表示しています。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            EDINET
            データの再利用・再配布・二次的著作物の作成にあたっては、利用条件・ライセンス・出典表示に関する注意事項等を遵守する必要があります。利用者が当該データを引用・転載・加工する場合は、自己責任において最新の公式ガイドラインおよびライセンス条項を確認してください。
          </p>
          <p>
            本サービスは、開示情報の正確性・完全性・最新性・有用性について一切保証しません。投資その他の意思決定は、必ず元資料および公式情報に基づいて行ってください。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. パブリックデータライセンス等</CardTitle>
          <CardDescription>
            国・地方公共団体等がパブリックデータとして提供するデータセットを利用する場合、デジタル庁のパブリック・データ（PDM）ライセンス等が適用されることがあります。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            該当するデータについては、表示義務・禁止事項・再ライセンス条件等をライセンス文面に従ってください。詳細は
            <a
              href="https://www.digital.go.jp/resources/open_data/public_data_license_v1.0"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              パブリック・データ（PDM）ライセンス
            </a>
            をご確認ください。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. 当サイトで取得・保存する情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">ブラウザのローカルストレージ</p>
            <p className="mt-1">
              お気に入り銘柄、表示列の設定、最近閲覧した企業などの利便性向上のため、ブラウザの localStorage
              に保存する場合があります。これらは当社のサーバーに自動送信されず、利用者のブラウザ内に留まります。削除はブラウザの設定から行えます。
            </p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-foreground">アクセス解析（Google Analytics）</p>
            <p className="mt-1">
              サイトの利用状況把握のため、Google Analytics を利用する場合があります。Cookie・端末情報・IPアドレス等が
              Google により収集・処理されることがあります。詳細は
              <a
                href="https://policies.google.com/privacy?hl=ja"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Google のプライバシーポリシー
              </a>
              をご参照ください。
            </p>
          </div>
          <Separator />
          <div>
            <p className="font-medium text-foreground">エラー監視（Sentry）</p>
            <p className="mt-1">
              品質改善のため、エラー情報を Sentry に送信する構成としている場合があります。送信される情報の範囲は Sentry
              の設定および同社のプライバシーポリシーに依存します。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4. お問い合わせ</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            本ポリシーに関するお問い合わせは、
            <a href="/contact" className="text-primary underline-offset-4 hover:underline">
              お問い合わせページ
            </a>
            からご連絡ください。
          </p>
        </CardContent>
      </Card>

      <DataAttributionBlock />
    </div>
  );
}
