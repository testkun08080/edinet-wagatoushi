// https://vike.dev/Head

import logoUrl from "../assets/logo.svg";
import {
  SITE_NAME,
  SITE_OG_DESCRIPTION,
  SITE_OG_IMAGE_ALT,
  SITE_OG_IMAGE_HEIGHT,
  SITE_OG_IMAGE_PATH,
  SITE_OG_IMAGE_SQUARE_PATH,
  SITE_OG_IMAGE_SQUARE_SIZE,
  SITE_OG_IMAGE_WIDTH,
  SITE_KEYWORDS,
} from "../lib/brand";

export function Head() {
  const siteTitle = SITE_NAME;
  const siteDescription = SITE_OG_DESCRIPTION;
  const siteUrl = import.meta.env.PUBLIC_ENV__SITE_URL ?? "";
  const ogImageUrl = siteUrl ? `${siteUrl}${SITE_OG_IMAGE_PATH}` : "";
  const ogImageSquareUrl = siteUrl ? `${siteUrl}${SITE_OG_IMAGE_SQUARE_PATH}` : "";

  return (
    <>
      <meta charSet="UTF-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
      />
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content={SITE_KEYWORDS} />
      <meta name="author" content="edinet-wagatoushi" />
      <meta name="robots" content="index, follow" />

      {/* OGP — 正方形を先に指定（1:1 クロップする SNS 向け）、横長は標準カード用 */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:type" content="website" />
      {siteUrl && <meta property="og:url" content={siteUrl} />}
      {ogImageSquareUrl && <meta property="og:image" content={ogImageSquareUrl} />}
      {ogImageSquareUrl && (
        <meta property="og:image:width" content={String(SITE_OG_IMAGE_SQUARE_SIZE)} />
      )}
      {ogImageSquareUrl && (
        <meta property="og:image:height" content={String(SITE_OG_IMAGE_SQUARE_SIZE)} />
      )}
      {ogImageSquareUrl && <meta property="og:image:alt" content={SITE_OG_IMAGE_ALT} />}
      {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
      {ogImageUrl && (
        <meta property="og:image:width" content={String(SITE_OG_IMAGE_WIDTH)} />
      )}
      {ogImageUrl && (
        <meta property="og:image:height" content={String(SITE_OG_IMAGE_HEIGHT)} />
      )}
      {ogImageUrl && <meta property="og:image:alt" content={SITE_OG_IMAGE_ALT} />}
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="ja_JP" />

      {/* Twitter Card — 横長を優先（summary_large_image） */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
      {ogImageUrl && <meta name="twitter:image:alt" content={SITE_OG_IMAGE_ALT} />}

      {/* Canonical */}
      {siteUrl && <link rel="canonical" href={siteUrl} />}

      {/* Favicon */}
      <link rel="icon" href={logoUrl} />
      <link rel="apple-touch-icon" href={logoUrl} />

      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap"
        rel="stylesheet"
      />

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: siteTitle,
            description: siteDescription,
            ...(siteUrl ? { url: siteUrl } : {}),
            applicationCategory: "FinanceApplication",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "JPY",
            },
          }),
        }}
      ></script>

    </>
  );
}
