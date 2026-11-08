import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { fieldClass } from "@/components/shell";

export function SearchBox({
  q,
  lang,
  sort,
}: {
  q: string;
  lang: string;
  sort: "new" | "stars";
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState(q);
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void navigate({ to: "/explore", search: { q: value, lang, sort } });
      }}
    >
      <label className="sr-only" htmlFor="q">
        بحث
      </label>
      <input
        id="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="ابحث بالعنوان أو الملف أو القلم"
        className={`${fieldClass} min-w-0 flex-1`}
      />
      <button
        type="submit"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-accent px-3 text-accent-ink"
        aria-label="بحث"
      >
        <Search className="size-4" />
      </button>
    </form>
  );
}
