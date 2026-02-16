import { CompanyTable } from "../../components/CompanyTable";
import { ColumnVisibilityControls } from "../../components/ColumnVisibilityControls";

export default function Page() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ヘッダー: スクロールしない */}
      <div className="shrink-0 flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold">企業一覧</h1>
          <p className="text-base-content/70 text-sm mt-1">
            サイドバーのフィルターで絞り込み、行をクリックすると企業詳細へ移動します。PER・PBR・配当利回りは株価連携で表示予定です。
          </p>
        </div>
        <div className="shrink-0">
          <ColumnVisibilityControls />
        </div>
      </div>
      {/* テーブルのみスクロール */}
      <div className="flex-1 min-h-0 overflow-auto">
        <CompanyTable />
      </div>
    </div>
  );
}
