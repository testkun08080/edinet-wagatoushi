// https://vike.dev/Head

import logoUrl from "../assets/logo.svg";

export function Head() {
  return (
    <>
      <link rel="icon" href={logoUrl} />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap"
        rel="stylesheet"
      />

      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${import.meta.env.PUBLIC_ENV__GOOGLE_ANALYTICS}`}
      ></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${import.meta.env.PUBLIC_ENV__GOOGLE_ANALYTICS}');`,
        }}
      ></script>
    </>
  );
}
