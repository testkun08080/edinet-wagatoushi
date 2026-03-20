"use client";

import { useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Alert, AlertDescription } from "../../components/ui/alert";

const CONTACT_EMAIL =
  (typeof import.meta.env.PUBLIC_ENV__CONTACT_EMAIL === "string" && import.meta.env.PUBLIC_ENV__CONTACT_EMAIL) || "";

export default function Page() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!CONTACT_EMAIL) {
      return;
    }
    const lines = [`お名前: ${name || "（未入力）"}`, "", body].join("\n");
    const q = new URLSearchParams({
      subject: subject || "【エディー】お問い合わせ",
      body: lines,
    });
    window.location.href = `mailto:${CONTACT_EMAIL}?${q.toString()}`;
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 overflow-auto p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">お問い合わせ</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          サービスに関するご質問・不具合報告・データ表示に関するご指摘などは、こちらからご連絡ください。
        </p>
      </div>

      {!CONTACT_EMAIL ? (
        <Alert>
          <AlertDescription>
            現在、公開用の問い合わせ先メールアドレスが設定されていません。デプロイ環境の環境変数{" "}
            <code className="rounded bg-muted px-1 text-xs">PUBLIC_ENV__CONTACT_EMAIL</code>{" "}
            に受付用アドレスを設定すると、下記フォームからメールクライアントが起動するようになります。
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">メールでのお問い合わせ</CardTitle>
          <CardDescription>
            送信ボタンで、お使いのメールアプリが開きます。環境によっては手動でコピーして送信してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">お名前（任意）</Label>
              <Input
                id="contact-name"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                autoComplete="name"
                disabled={!CONTACT_EMAIL}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">件名（任意）</Label>
              <Input
                id="contact-subject"
                value={subject}
                onChange={(ev) => setSubject(ev.target.value)}
                placeholder="【エディー】お問い合わせ"
                disabled={!CONTACT_EMAIL}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-body">お問い合わせ内容</Label>
              <Textarea
                id="contact-body"
                value={body}
                onChange={(ev) => setBody(ev.target.value)}
                rows={6}
                required
                disabled={!CONTACT_EMAIL}
                placeholder="本文をご記入ください。"
              />
            </div>
            <Button type="submit" disabled={!CONTACT_EMAIL || !body.trim()}>
              メールアプリで送信
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
