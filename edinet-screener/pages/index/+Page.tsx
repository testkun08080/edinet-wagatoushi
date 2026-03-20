import { CompanyTable } from "../../components/CompanyTable";
import { ColumnVisibilityControls } from "../../components/ColumnVisibilityControls";
import { FavoritesViewToggle } from "../../components/FavoritesViewToggle";
import { TableDownloadButton } from "../../components/TableDownloadButton";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";

export default function Page() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-0 lg:px-6 lg:pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold tracking-tight">
              企業一覧
            </CardTitle>
            <CardAction>
              <div className="flex flex-wrap items-center gap-1.5">
                <FavoritesViewToggle />
                <Separator orientation="vertical" className="!h-6 mx-1 hidden sm:block" />
                <ColumnVisibilityControls />
                <TableDownloadButton />
              </div>
            </CardAction>
          </CardHeader>
        </Card>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-4 py-4 lg:px-6">
        <CompanyTable />
      </div>
    </div>
  );
}
