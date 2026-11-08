import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { filesLabel, formatStamp, langLabel, type ScriptCard } from "@/lib/script-model";

export function ScriptList({ scripts }: { scripts: ScriptCard[] }) {
  if (scripts.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface px-4 py-10 text-center text-muted">
        لا توجد سكربتات بهذا البحث.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {scripts.map((script) => (
        <Link
          key={script.slug}
          to="/s/$slug"
          params={{ slug: script.slug }}
          className="block border-b border-line px-4 py-4 last:border-b-0 hover:bg-raised"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs text-accent">{langLabel(script.leadLang)}</p>
              <h2 className="mt-1 truncate text-lg font-semibold">{script.title}</h2>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 font-mono text-sm tabular-nums text-muted">
              <Star className="size-4" aria-hidden="true" />
              {script.stars}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {script.handle}
            <span className="px-1">·</span>
            <span dir="ltr" className="font-mono">
              {script.leadFile}
            </span>
            {script.fileCount > 1 ? (
              <>
                <span className="px-1">·</span>
                {filesLabel(script.fileCount)}
              </>
            ) : null}
            <span className="px-1">·</span>
            <span className="tabular-nums">{formatStamp(script.updatedAt)}</span>
          </p>
          {script.summary ? <p className="mt-2 line-clamp-2 text-sm text-fg">{script.summary}</p> : null}
          {script.leadPreview ? (
            <p dir="ltr" className="mt-2 truncate text-left font-mono text-xs text-muted">
              {script.leadPreview}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
