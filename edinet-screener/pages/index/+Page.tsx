import { CompanyTable } from "../../components/CompanyTable";
import { ColumnVisibilityControls } from "../../components/ColumnVisibilityControls";
import { FavoritesViewToggle } from "../../components/FavoritesViewToggle";
import { TableDownloadButton } from "../../components/TableDownloadButton";

export default function Page() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ヘッダー（Stitch 風） */}
      <header className="shrink-0 p-6 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold m-0 tracking-tight text-slate-900">企業一覧</h1>
            {/* <p className="text-slate-500 text-sm mt-1">
              サイドバーのフィルターで絞り込み、行をクリックすると企業詳細へ移動します。PER・PBR・配当利回りは株価連携で表示予定です。
            </p> */}
          </div>
          <div className="shrink-0 flex flex-wrap items-center justify-end gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <FavoritesViewToggle />
            <ColumnVisibilityControls />
            <TableDownloadButton />
          </div>
        </div>
      </header>
      {/* テーブル */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <CompanyTable />
      </div>
    </div>
  );
}
