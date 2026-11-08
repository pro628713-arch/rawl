export const LANGS = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "lua", label: "Lua" },
  { id: "shell", label: "Shell" },
  { id: "css", label: "CSS" },
  { id: "html", label: "HTML" },
  { id: "json", label: "JSON" },
  { id: "sql", label: "SQL" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "markdown", label: "Markdown" },
  { id: "text", label: "Text" },
] as const;

export type Lang = (typeof LANGS)[number]["id"];

export const LANG_IDS = new Set<string>(LANGS.map((l) => l.id));

export const LICENSES = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "Unlicense"] as const;

export type ScriptCard = {
  slug: string;
  title: string;
  summary: string;
  handle: string;
  tags: string[];
  license: string;
  stars: number;
  forks: number;
  views: number;
  updatedAt: string;
  leadFile: string;
  leadLang: string;
  leadPreview: string;
  fileCount: number;
};

export type ScriptFile = {
  filename: string;
  language: string;
  content: string;
};

export type Revision = {
  message: string;
  createdAt: string;
};

export type ScriptDetail = ScriptCard & {
  forkedFrom: string | null;
  files: ScriptFile[];
  revisions: Revision[];
};

export type DraftFile = {
  filename: string;
  language: Lang;
  content: string;
};

export type Draft = {
  title: string;
  summary: string;
  handle: string;
  tags: string;
  license: string;
  message: string;
  files: DraftFile[];
};

export type CleanDraft = Draft;

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

const EXT: Record<string, Lang> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  py: "python",
  lua: "lua",
  sh: "shell",
  bash: "shell",
  css: "css",
  html: "html",
  json: "json",
  sql: "sql",
  go: "go",
  rs: "rust",
  md: "markdown",
  txt: "text",
};

export function langFromFilename(filename: string): Lang | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT[ext] ?? null;
}

export function langLabel(id: string): string {
  return LANGS.find((l) => l.id === id)?.label ?? id;
}

export function filesLabel(n: number): string {
  if (n <= 1) return "ملف واحد";
  if (n === 2) return "ملفان";
  return `${n} ملفات`;
}

export function formatStamp(iso: string): string {
  return iso.slice(0, 10);
}

export function emptyDraft(): Draft {
  return {
    title: "",
    summary: "",
    handle: "",
    tags: "",
    license: "MIT",
    message: "",
    files: [{ filename: "main.js", language: "javascript", content: "" }],
  };
}

export const SAMPLE_DRAFT: Draft = {
  title: "مهلة الكتابة",
  summary: "debounce صغيرة للأزرار وحقول البحث.",
  handle: "guest",
  tags: "ui, events",
  license: "MIT",
  message: "نشر أول نسخة",
  files: [
    {
      filename: "debounce.js",
      language: "javascript",
      content: `export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
`,
    },
  ],
};

function cleanHandle(raw: string): string {
  const h = raw.trim().replace(/\s+/g, "-");
  if (!h) return "guest";
  if (h.includes("@")) throw new UserError("اسم القلم ليس بريدًا");
  if (!/^[\p{L}\p{N}_-]{2,20}$/u.test(h)) throw new UserError("اسم القلم: من حرفين إلى 20");
  return h;
}

function cleanTags(raw: string): string {
  const parts = raw
    .split(/[,،]/)
    .map((t) => t.trim().replace(/\s+/g, "-"))
    .filter(Boolean)
    .slice(0, 5);
  for (const part of parts) {
    if (!/^[\p{L}\p{N}_-]{1,16}$/u.test(part)) throw new UserError("وسم غير مقبول");
  }
  return parts.join(",");
}

export function cleanDraft(input: Draft): CleanDraft {
  if (!input || !Array.isArray(input.files)) throw new UserError("بيانات ناقصة");
  const title = String(input.title ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (title.length < 2 || title.length > 80) throw new UserError("العنوان من حرفين إلى 80");
  const summary = String(input.summary ?? "")
    .trim()
    .slice(0, 500);
  const handle = cleanHandle(String(input.handle ?? ""));
  const tags = cleanTags(String(input.tags ?? ""));
  const license = (LICENSES as readonly string[]).includes(input.license) ? input.license : "MIT";
  const message = String(input.message ?? "")
    .trim()
    .slice(0, 140);
  if (input.files.length < 1 || input.files.length > 6) {
    throw new UserError("أضف من ملف واحد إلى ستة");
  }
  const seen = new Set<string>();
  const files = input.files.map((file) => {
    const filename = String(file.filename ?? "").trim();
    if (
      !/^[\w.\-\u0600-\u06FF]{1,64}$/.test(filename) ||
      filename.includes("..") ||
      filename.startsWith(".")
    ) {
      throw new UserError("اسم الملف غير مقبول");
    }
    const key = filename.toLowerCase();
    if (seen.has(key)) throw new UserError("اسم الملف مكرر");
    seen.add(key);
    if (!LANG_IDS.has(file.language)) throw new UserError("لغة غير مدعومة");
    const content = String(file.content ?? "").replace(/\u0000/g, "");
    if (content.trim().length < 1 || content.length > 60000) {
      throw new UserError("كل ملف بين حرف واحد و 60000");
    }
    return { filename, language: file.language, content };
  });
  return { title, summary, handle, tags, license, message, files };
}

export function rawPath(slug: string, filename?: string): string {
  if (!filename) return `/raw/${slug}`;
  return `/raw/${slug}/${encodeURIComponent(filename)}`;
}
