// https://vike.dev/Head

import logoUrl from "../assets/logo.svg";

export function Head() {
  const siteTitle = "EDINET財務スクリーナー";
  const siteDescription = "EDINETから取得した有価証券報告書等を解析・可視化。10年分の財務データを検索・分析できるWebスクリーナー。個人投資家向けの無料ツール。";
  const siteUrl = "https://edinet-screener.example.com";

  return (
    <>
      <meta charSet="UTF-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
      />
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content="EDINET,有価証券報告書,財務データ,スクリーナー,投資,株式分析" />
      <meta name="author" content="edinet-wagatoushi" />
      <meta name="robots" content="index, follow" />

      {/* OGP */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:image" content={`${siteUrl}/og-image.png`} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="ja_JP" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta name="twitter:image" content={`${siteUrl}/og-image.png`} />

      {/* Canonical */}
      <link rel="canonical" href={siteUrl} />

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
            "name": siteTitle,
            "description": siteDescription,
            "url": siteUrl,
            "applicationCategory": "FinanceApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "JPY"
            }
          })
        }}
      ></script>

      {/* Google Analytics (template - implementation placeholder) */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${import.meta.env.PUBLIC_ENV__GOOGLE_ANALYTICS}`}
      ></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Google Analytics initialization (to be implemented)
            // window.dataLayer = window.dataLayer || [];
            // function gtag(){dataLayer.push(arguments);}
            // gtag('js', new Date());
            // gtag('config', '${import.meta.env.PUBLIC_ENV__GOOGLE_ANALYTICS}');
          `,
        }}
      ></script>
    </>
  );
}
