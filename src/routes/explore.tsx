import { createFileRoute, Link } from "@tanstack/react-router";
import { listScripts } from "@/lib/scripts.functions";
import { LANGS, langLabel } from "@/lib/script-model";
import { Shell } from "@/components/shell";
import { ScriptList } from "@/components/script-list";
import { SearchBox } from "@/components/search-box";
import { cn } from "@/lib/cn";

type ExploreSearch = { q: string; lang: string; sort: "new" | "stars" };

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): ExploreSearch => ({
    q: typeof search.q === "string" ? search.q.slice(0, 60) : "",
    lang: typeof search.lang === "string" ? search.lang : "",
    sort: search.sort === "stars" ? "stars" : "new",
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listScripts({ data: deps }),
  component: ExplorePage,
  pendingComponent: () => (
    <Shell>
      <p className="text-muted">جارٍ البحث…</p>
    </Shell>
  ),
});

function ExplorePage() {
  const search = Route.useSearch();
  const data = Route.useLoaderData();
  return (
    <Shell>
      <h1 className="text-3xl font-semibold">استكشف</h1>
      <p className="mt-2 text-muted">صفِّ اللغة أو رتّب بالنجوم. النتائج عامة.</p>
      <div className="mt-4">
        <SearchBox key={search.q} q={search.q} lang={search.lang} sort={search.sort} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Filter to={{ q: search.q, lang: "", sort: search.sort }} active={search.lang === ""}>
          الكل
        </Filter>
        {LANGS.map((lang) => {
          const count = data.langs.find((item) => item.language === lang.id)?.n ?? 0;
          if (count === 0 && search.lang !== lang.id) return null;
          return (
            <Filter
              key={lang.id}
              to={{ q: search.q, lang: lang.id, sort: search.sort }}
              active={search.lang === lang.id}
            >
              {langLabel(lang.id)} · {count}
            </Filter>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <Filter to={{ ...search, sort: "new" }} active={search.sort === "new"}>
          الأحدث
        </Filter>
        <Filter to={{ ...search, sort: "stars" }} active={search.sort === "stars"}>
          النجوم
        </Filter>
      </div>
      <div className="mt-6">
        <ScriptList scripts={data.scripts} />
      </div>
    </Shell>
  );
}

function Filter({
  to,
  active,
  children,
}: {
  to: ExploreSearch;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      to="/explore"
      search={to}
      className={cn(
        "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm",
        active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-fg",
      )}
    >
      {children}
    </Link>
  );
}
