"use client";

import { useState } from "react";
import { useFilters } from "./FilterContext";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Check, Share2 } from "lucide-react";

export function ShareButton() {
  const { getShareableUrl } = useFilters();
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: "twitter" | "line" | "email") => {
    const shareUrl = getShareableUrl();
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${baseUrl}${shareUrl.startsWith("?") ? "" : "/"}${shareUrl}`;
    const encodedUrl = encodeURIComponent(fullUrl);

    const title = "銘柄スクリーナーの検索結果を見つけた！";
    const text = `株式スクリーナーで見つけた銘柄です：${encodedUrl}`;

    let shareLink = "";

    switch (platform) {
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodedUrl}`;
        break;
      case "line":
        shareLink = `https://line.me/R/msg/text/${encodeURIComponent(`${title}\n${fullUrl}`)}`;
        break;
      case "email":
        shareLink = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`このスクリーナー結果をご覧ください：\n${fullUrl}`)}`;
        break;
    }

    if (shareLink) {
      window.open(shareLink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="size-4" />
          <span className="hidden sm:inline">共有</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={handleCopyUrl} className="flex items-center gap-2 cursor-pointer">
          {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          <span>{copied ? "URLをコピーしました" : "URLをコピー"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("twitter")} className="flex items-center gap-2 cursor-pointer">
          <span>𝕏 Twitter で共有</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("line")} className="flex items-center gap-2 cursor-pointer">
          <span>LINE で共有</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("email")} className="flex items-center gap-2 cursor-pointer">
          <span>メール で共有</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
