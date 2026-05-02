"use client";

import { useState } from "react";
import { CompanyTable } from "../../components/CompanyTable";
import { ColumnVisibilityControls } from "../../components/ColumnVisibilityControls";
import { FavoritesViewToggle } from "../../components/FavoritesViewToggle";
import { TableDownloadButton } from "../../components/TableDownloadButton";
import { PresetScreeners } from "../../components/PresetScreeners";
import { ShareButton } from "../../components/ShareButton";
import { Card, CardHeader, CardAction } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Button } from "../../components/ui/button";
import { useFilters } from "../../components/FilterContext";
import { Share2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

export default function Page() {
  const { getShareableUrl } = useFilters();
  const [copied, setCopied] = useState(false);

  const handleShareUrl = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0 px-3 pt-3 pb-0 sm:px-4 sm:pt-4 lg:px-6 lg:pt-6">
        <Card>
          <CardHeader className="has-data-[slot=card-action]:grid-cols-1">
            <CardAction className="col-start-1 justify-self-start">
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                <PresetScreeners />
                <Separator orientation="vertical" className="!h-6 mx-0.5 hidden sm:block" />
                <FavoritesViewToggle />
                <Separator orientation="vertical" className="!h-6 mx-0.5 hidden sm:block" />
                <ColumnVisibilityControls />
                <TableDownloadButton />
                <Separator orientation="vertical" className="!h-6 mx-0.5 hidden sm:block" />
                <ShareButton />
                <Button
                  variant={copied ? "default" : "outline"}
                  size="sm"
                  onClick={handleShareUrl}
                  title="スクリーニング結果をURLでシェア"
                  className="px-2 sm:px-3"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      <span className="hidden sm:inline">コピー</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="size-4" />
                      <span className="hidden sm:inline">URL共有</span>
                    </>
                  )}
                </Button>
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
