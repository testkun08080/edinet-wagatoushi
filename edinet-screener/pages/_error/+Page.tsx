import { usePageContext } from "vike-react/usePageContext";

export default function Page() {
  const { is404 } = usePageContext();
  if (is404) {
    return (
      <>
        <h1>ページが見つかりません</h1>
        <p>お探しのページは見つかりませんでした。</p>
      </>
    );
  }
  return (
    <>
      <h1>エラーが発生しました</h1>
      <p>申し訳ございません。時間をおいて再度お試しください。</p>
    </>
  );
}
