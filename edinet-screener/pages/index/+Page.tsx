"use client";

import { CompanyTable } from "../../components/CompanyTable";
import { ColumnVisibilityControls } from "../../components/ColumnVisibilityControls";
import { FavoritesViewToggle } from "../../components/FavoritesViewToggle";
import { TableDownloadButton } from "../../components/TableDownloadButton";
import { PresetScreeners } from "../../components/PresetScreeners";
import { ShareButton } from "../../components/ShareButton";
import { Card, CardHeader, CardAction } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";

export default function Page() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0 px-3 pt-3 pb-0 sm:px-4 sm:pt-4 lg:px-6 lg:pt-6">
        <Card>
          <CardHeader className="has-data-[slot=card-action]:grid-cols-1">
            <CardAction className="col-start-1 justify-self-start">
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                <PresetScreeners />
                <Separator orientation="vertical" className="h-6! mx-0.5 hidden sm:block" />
                <FavoritesViewToggle />
                <Separator orientation="vertical" className="h-6! mx-0.5 hidden sm:block" />
                <ColumnVisibilityControls />
                <TableDownloadButton />
                <Separator orientation="vertical" className="h-6! mx-0.5 hidden sm:block" />
                <ShareButton />
              </div>
            </CardAction>
          </CardHeader>
        </Card>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <CompanyTable />
      </div>
    </div>
  );
}
