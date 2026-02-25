Generated with [vike.dev/new](https://vike.dev/new) ([version 564](https://www.npmjs.com/package/create-vike/v/0.0.564)) using this command:

```sh
npm create vike@latest --- --react --tailwindcss --daisyui --google-analytics --cloudflare --eslint --prettier --sentry
```

## Build & データ

- **`npm run build`**: プロジェクトルートに `data-set/` がある場合はそこから、**`DATA_SET_URL` が設定されている場合はその URL から未取得時のみ取得**してから、`public/data` を生成し Vike ビルドします。どちらも無い場合はデータ生成をスキップします。
- **`npm run build:app`**: データ生成を行わず Vike ビルドのみ実行。
- **リモートのデータセットでビルド**: `DATA_SET_URL=https://.../data-set.zip npm run build`（zip / tar.gz 対応）。データをどこかにホストしておき、ローカルに置かずにビルド可能。詳しくは [docs/DATA_SET_ALTERNATIVES.md](../docs/DATA_SET_ALTERNATIVES.md)。

## Contents

- [Vike](#vike)
  - [Plus files](#plus-files)
  - [Routing](#routing)
  - [SSR](#ssr)
  - [HTML Streaming](#html-streaming)
- [Photon](#photon)
- [Sentry Browser / Error Tracking & Performance Monitoring](#sentry-browser--error-tracking--performance-monitoring)

## Vike

This app is ready to start. It's powered by [Vike](https://vike.dev) and [React](https://react.dev/learn).

### Plus files

[The + files are the interface](https://vike.dev/config) between Vike and your code.

- [`+config.ts`](https://vike.dev/settings) — Settings (e.g. `<title>`)
- [`+Page.tsx`](https://vike.dev/Page) — The `<Page>` component
- [`+data.ts`](https://vike.dev/data) — Fetching data (for your `<Page>` component)
- [`+Layout.tsx`](https://vike.dev/Layout) — The `<Layout>` component (wraps your `<Page>` components)
- [`+Head.tsx`](https://vike.dev/Head) - Sets `<head>` tags
- [`/pages/_error/+Page.tsx`](https://vike.dev/error-page) — The error page (rendered when an error occurs)
- [`+onPageTransitionStart.ts`](https://vike.dev/onPageTransitionStart) and `+onPageTransitionEnd.ts` — For page transition animations

### Routing

[Vike's built-in router](https://vike.dev/routing) lets you choose between:

- [Filesystem Routing](https://vike.dev/filesystem-routing) (the URL of a page is determined based on where its `+Page.jsx` file is located on the filesystem)
- [Route Strings](https://vike.dev/route-string)
- [Route Functions](https://vike.dev/route-function)

### SSR

SSR is enabled by default. You can [disable it](https://vike.dev/ssr) for all or specific pages.

### HTML Streaming

You can [enable/disable HTML streaming](https://vike.dev/stream) for all or specific pages.

## Photon

[Photon](https://photonjs.dev) is a next-generation infrastructure for deploying JavaScript servers.

See [Introducing Photon](https://vike.dev/blog/photon) and [Why Photon](https://photonjs.dev/why) to learn more.

## Sentry Browser / Error Tracking & Performance Monitoring

This app is integrated with [Sentry](https://sentry.io) for error tracking.

> \[!NOTE]
> Sentry Error Tracking is **only activated in production** (`import.meta.env.PROD === true`)!

**Testing Sentry** receiving Errors:

1. Build & Start the app `npm run build && npm run preview`.
2. open Testpage in browser: http://localhost:3000/sentry.
3. check your [Sentry Dashboard](https://sentry.io) for new Errors.

