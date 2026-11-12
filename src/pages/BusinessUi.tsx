import type { PropsWithChildren } from "react";
export function Link({ href, className, children }: PropsWithChildren<{ href: string; className?: string }>) {
  return <a href={href} className={className}>{children}</a>;
}
