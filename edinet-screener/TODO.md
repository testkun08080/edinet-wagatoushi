Follow the steps below to finish setting up your application.

## Sentry Browser / Error Tracking & Performance Monitoring

Add your Sentry DSN to `.env` file.
You can configure [Sentry for the browser](https://docs.sentry.io/platforms/javascript/guides/react/) in `sentry.browser.config.ts`.

Upload of source maps to Sentry is handled by the [`sentryVitePlugin`](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/) in `vite.config.ts`.
You have to configure `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` in the `.env.sentry-build-plugin` file with the values from your Sentry account.

## Cloudflare Workers

Run [`wrangler types`](https://developers.cloudflare.com/workers/wrangler/commands/#types) to generate the `worker-configuration.d.ts` file:

```sh
npx wrangler types
```

> Re-run it whenever you change your Cloudflare configuration to update `worker-configuration.d.ts`.

Then commit `worker-configuration.d.ts`:

```sh
git commit -am "add cloudflare types"
```

See also: https://vike.dev/cloudflare#typescript

