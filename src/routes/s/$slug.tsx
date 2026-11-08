import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, Download, GitFork, Pencil, Star } from "lucide-react";
import { Shell } from "@/components/shell";
import { CodeView } from "@/components/code-view";
import { Button } from "@/components/ui/button";
import { branchScript, getScript, toggleStar } from "@/lib/scripts.functions";
import {
  filesLabel,
  formatStamp,
  langLabel,
  rawPath,
} from "@/lib/script-model";
import {
  hasStar,
  markJustPublished,
  readHandle,
  readToken,
  saveHandle,
  saveToken,
  takeJustPublished,
  voterKey,
  writeStar,
} from "@/lib/vault";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/s/$slug")({
  loader: ({ params }) => getScript({ data: { slug: params.slug } }),
  component: ScriptPage,
  pendingComponent: () => (
    <Shell>
      <p className="text-muted">جارٍ فتح السكربت…</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <h1 className="text-2xl font-semibold">السكربت غير موجود</h1>
      <Link to="/explore" search={{ q: "", lang: "", sort: "new" }} className="mt-4 inline-flex min-h-11 items-center text-accent">
        عودة للاستكشاف
      </Link>
    </Shell>
  ),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} · راوي` : "راوي" }],
  }),
});

function ScriptPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [starred, setStarred] = useState(false);
  const [banner, setBanner] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const file = data.files[active] ?? data.files[0];

  useEffect(() => {
    setActive(0);
    setStarred(hasStar(data.slug));
    if (takeJustPublished(data.slug)) {
      setBanner(readToken(data.slug));
    } else {
      setBanner("");
    }
  }, [data.slug]);

  async function onStar() {
    const on = !starred;
    setBusy("star");
    setNote("");
    try {
      await toggleStar({ data: { slug: data.slug, voter: voterKey(), on } });
      writeStar(data.slug, on);
      setStarred(on);
      await router.invalidate();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "تعذّر تسجيل النجمة");
    } finally {
      setBusy("");
    }
  }

  async function onFork() {
    setBusy("fork");
    setNote("");
    try {
      const handle = readHandle() || "guest";
      const created = await branchScript({ data: { slug: data.slug, handle } });
      saveToken(created.slug, created.editToken);
      saveHandle(handle);
      markJustPublished(created.slug);
      await navigate({ to: "/s/$slug", params: { slug: created.slug } });
    } catch (error) {
      setNote(error instanceof Error ? error.message : "تعذّر التفرّع");
    } finally {
      setBusy("");
    }
  }

  if (!file) {
    return (
      <Shell>
        <p>هذا السكربت بلا ملفات.</p>
      </Shell>
    );
  }

  const path = rawPath(data.slug, file.filename);
  return (
    <Shell>
      <p className="font-mono text-xs text-muted">
        {data.handle}
        <span className="px-1">/</span>
        <span dir="ltr">{data.slug}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-semibold">{data.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant={starred ? "primary" : "ghost"} disabled={busy === "star"} onClick={() => void onStar()} aria-pressed={starred}>
            <Star className={cn("size-4", starred && "fill-accent-ink")} />
            {data.stars}
          </Button>
          <Button variant="ghost" disabled={busy === "fork"} onClick={() => void onFork()}>
            <GitFork className="size-4" />
            تفرّع
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/s/$slug/edit" params={{ slug: data.slug }}>
              <Pencil className="size-4" />
              تعديل
            </Link>
          </Button>
        </div>
      </div>
      {data.summary ? <p className="mt-3 max-w-3xl text-muted">{data.summary}</p> : null}
      {banner ? (
        <div className="mt-4 rounded-lg border border-accent bg-surface p-4 text-sm">
          <p>نُشر السكربت. احفظ رمز التحرير إن غيّرت المتصفح — بدونه لا تعديل ولا حذف.</p>
          <p dir="ltr" className="mt-2 break-all text-left font-mono text-accent">
            {banner}
          </p>
        </div>
      ) : null}
      {note ? (
        <p role="alert" className="mt-3 text-sm text-accent">
          {note}
        </p>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <div className="flex gap-2 overflow-x-auto">
            {data.files.map((item, index) => (
              <button
                key={item.filename}
                type="button"
                dir="ltr"
                onClick={() => setActive(index)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center rounded-t-lg border border-b-0 px-3 font-mono text-sm",
                  index === active
                    ? "border-line bg-surface text-fg"
                    : "border-transparent text-muted",
                )}
              >
                {item.filename}
              </button>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg rounded-ss-none border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
              <span className="font-mono text-xs text-accent">{langLabel(file.language)}</span>
              <span className="ms-auto flex flex-wrap gap-2">
                <CopyText text={file.content} label="نسخ" />
                <Button variant="quiet" onClick={() => download(file.filename, file.content)}>
                  <Download className="size-4" />
                  تنزيل
                </Button>
              </span>
            </div>
            <CodeView content={file.content} language={file.language} />
          </div>
          <Usage path={path} language={file.language} />
        </div>
        <aside className="grid h-fit gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
          <Meta label="القلم" value={data.handle} />
          <Meta label="الرخصة" value={data.license} />
          <Meta label="الملفات" value={filesLabel(data.fileCount)} />
          <Meta label="المشاهدات" value={String(data.views)} />
          <Meta label="التفرعات" value={String(data.forks)} />
          <Meta label="التحديث" value={formatStamp(data.updatedAt)} />
          {data.forkedFrom ? (
            <p>
              <span className="text-muted">تفرّع من </span>
              <Link to="/s/$slug" params={{ slug: data.forkedFrom }} className="text-accent">
                {data.forkedFrom}
              </Link>
            </p>
          ) : null}
          {data.tags.length > 0 ? (
            <p className="text-muted">{data.tags.join(" · ")}</p>
          ) : null}
          <div>
            <p className="text-muted">السجل</p>
            <ul className="mt-2 grid gap-2">
              {data.revisions.map((rev, index) => (
                <li key={`${rev.createdAt}-${index}`}>
                  <span className="font-mono text-xs text-muted">{formatStamp(rev.createdAt)}</span>
                  <span className="mt-1 block">{rev.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-muted">{label}</span>
      <span className="mt-1 block tabular-nums">{value}</span>
    </p>
  );
}

function Usage({ path, language }: { path: string; language: string }) {
  const [href, setHref] = useState(path);
  useEffect(() => {
    setHref(window.location.origin + path);
  }, [path]);
  const lines = [`curl -fsSL ${href}`];
  if (language === "javascript") lines.push(`<script src="${href}"></script>`);
  if (language === "css") lines.push(`<link rel="stylesheet" href="${href}">`);
  return (
    <section className="mt-4 rounded-lg border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">استخدام الرابط الخام</h2>
      <div className="mt-3 grid gap-2">
        {lines.map((line) => (
          <div key={line} className="flex items-start gap-2">
            <code dir="ltr" className="min-w-0 flex-1 overflow-x-auto text-left font-mono text-xs text-muted">
              {line}
            </code>
            <CopyText text={line} label="نسخ" />
          </div>
        ))}
      </div>
    </section>
  );
}

function CopyText({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="quiet"
      onClick={() => {
        void copyText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        });
      }}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? "تم" : label}
    </Button>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
