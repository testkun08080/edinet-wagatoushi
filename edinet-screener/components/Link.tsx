import { usePageContext } from "vike-react/usePageContext";

export function Link({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const pageContext = usePageContext();
  const { urlPathname } = pageContext;
  const isActive = href === "/" ? urlPathname === href : urlPathname.startsWith(href);
  const classNames = [isActive && "is-active", className].filter(Boolean).join(" ");
  return <a href={href} className={classNames || undefined}>{children}</a>;
}
