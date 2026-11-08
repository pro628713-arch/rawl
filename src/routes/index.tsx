import { createFileRoute, Link } from "@tanstack/react-router";
import { getHome } from "@/lib/scripts.functions";
import { Shell } from "@/components/shell";
import { ScriptList } from "@/components/script-list";
import { SearchBox } from "@/components/search-box";
import { rawPath } from "@/lib/script-model";

export const Route = createFileRoute("/")({
  loader: () => getHome(),
  component: Home,
  pendingComponent: () => (
    <Shell>
      <p className="text-muted">جارٍ فتح المستودع…</p>
    </Shell>
  ),
});

function Home() {
  const data = Route.useLoaderData();
  const lead = data.loved[0] ?? data.recent[0];
  return (
    <Shell>
      <section className="grid items-end gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="font-mono text-xs text-accent">RAWI / PUBLIC HOST</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">مستودع السكربتات</h1>
          <p className="mt-3 max-w-xl text-muted">
            انشر ملفًا أو حزمة صغيرة وخذ رابطًا خامًا جاهزًا لـ curl أو وسم script. بلا حساب — رمز
            تحرير سري يبقى في متصفحك.
          </p>
          <p className="mt-3 text-sm">
            <Link to="/workers" className="text-accent">
              جاهز للرفع على Cloudflare Workers
            </Link>
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3 lg:col-span-5">
          <Stat label="سكربتات" value={data.stats.scripts} />
          <Stat label="ملفات" value={data.stats.files} />
          <Stat label="نجوم" value={data.stats.stars} />
        </dl>
      </section>
      <div className="mt-6">
        <SearchBox q="" lang="" sort="new" />
      </div>
      {lead ? (
        <section className="mt-6 rounded-lg border border-line bg-surface p-4">
          <p className="font-mono text-xs text-muted">رابط خام</p>
          <p dir="ltr" className="mt-2 truncate text-left font-mono text-sm text-accent">
            {rawPath(lead.slug, lead.leadFile)}
          </p>
          <p dir="ltr" className="mt-3 truncate text-left font-mono text-xs text-muted">
            {lead.leadPreview || lead.title}
          </p>
          <Link
            to="/s/$slug"
            params={{ slug: lead.slug }}
            className="mt-3 inline-flex min-h-11 items-center text-sm text-fg"
          >
            فتح {lead.title}
          </Link>
        </section>
      ) : null}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">الأحدث</h2>
          <Link to="/explore" search={{ q: "", lang: "", sort: "new" }} className="text-sm text-accent">
            كل المستودع
          </Link>
        </div>
        <ScriptList scripts={data.recent} />
      </section>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">الأكثر نجومًا</h2>
          <Link to="/explore" search={{ q: "", lang: "", sort: "stars" }} className="text-sm text-accent">
            الترتيب الكامل
          </Link>
        </div>
        <ScriptList scripts={data.loved} />
      </section>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-2xl tabular-nums">{value}</dd>
    </div>
  );
}
