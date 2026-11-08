import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const LINKS = [
  { to: "/explore", label: "استكشف" },
  { to: "/workers", label: "Workers" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="h-1 bg-accent" />
      <header className="sticky top-0 z-20 border-b border-line bg-bg">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
          <Link to="/" className="flex min-h-11 items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-accent font-mono text-sm font-medium text-accent-ink">
              R
            </span>
            <span className="text-lg font-semibold">راوي</span>
          </Link>
          <nav className="ms-auto flex items-center gap-1">
            {LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm",
                  item.to === "/workers" && "hidden sm:inline-flex",
                  path.startsWith(item.to) ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/new"
              className="inline-flex min-h-11 items-center rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink"
            >
              <span className="sm:hidden">جديد</span>
              <span className="hidden sm:inline">سكربت جديد</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>راوي — مستودع عام بلا حسابات. الروابط الخام تعمل من أي صفحة.</p>
          <a className="text-accent" href="/rawi-cloudflare.zip" download>
            تنزيل حزمة Cloudflare Workers
          </a>
        </div>
      </footer>
    </div>
  );
}

export const fieldClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-fg outline-none placeholder:text-muted focus-visible:border-accent";
