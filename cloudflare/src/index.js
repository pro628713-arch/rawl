const DDL = [
  `create table if not exists scripts (
    id text primary key,
    slug text not null unique,
    title text not null,
    summary text not null default '',
    handle text not null default 'guest',
    tags text not null default '',
    license text not null default 'MIT',
    stars integer not null default 0,
    forks integer not null default 0,
    views integer not null default 0,
    forked_from text,
    edit_token text not null,
    created_at text not null default (datetime('now')),
    updated_at text not null default (datetime('now'))
  )`,
  `create table if not exists script_files (
    id text primary key,
    script_id text not null,
    filename text not null,
    language text not null,
    content text not null,
    position integer not null default 0,
    unique (script_id, filename)
  )`,
  `create table if not exists script_revisions (
    id text primary key,
    script_id text not null,
    message text not null,
    created_at text not null default (datetime('now'))
  )`,
  `create table if not exists script_stars (
    script_id text not null,
    voter_key text not null,
    primary key (script_id, voter_key)
  )`,
  `create index if not exists scripts_updated_idx on scripts (updated_at desc)`,
];

const LANGS = ["javascript", "typescript", "python", "lua", "shell", "css", "html", "json", "sql", "go", "rust", "markdown", "text"];
const LICENSES = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "Unlicense"];

const SEEDS = [
  {
    id: "seed-debounce",
    slug: "debounce-hook",
    title: "مهلة الكتابة",
    summary: "دالة debounce بلا اعتماديات.",
    handle: "mira",
    tags: "ui,events",
    license: "MIT",
    stars: 42,
    views: 180,
    ago: "-1 day",
    file: {
      filename: "debounce.js",
      language: "javascript",
      content: "export function debounce(fn, wait = 200) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), wait);\n  };\n}\n",
    },
  },
  {
    id: "seed-retry",
    slug: "retry-backoff",
    title: "إعادة المحاولة",
    summary: "جلب HTTP مع تراجع أسي.",
    handle: "karam",
    tags: "http,python",
    license: "Apache-2.0",
    stars: 36,
    views: 140,
    ago: "-2 days",
    file: {
      filename: "retry.py",
      language: "python",
      content: "import time\nfrom urllib import request\n\ndef fetch(url, attempts=4, timeout=8):\n    delay = 0.4\n    last = None\n    for _ in range(attempts):\n        try:\n            with request.urlopen(url, timeout=timeout) as res:\n                return res.read()\n        except Exception as exc:\n            last = exc\n            time.sleep(delay)\n            delay *= 2\n    raise RuntimeError('failed after retries') from last\n",
    },
  },
  {
    id: "seed-tokens",
    slug: "rawi-tokens",
    title: "رموز راوي",
    summary: "ألوان الواجهة كمتغيرات CSS.",
    handle: "studio",
    tags: "css,theme",
    license: "MIT",
    stars: 19,
    views: 70,
    ago: "-4 days",
    file: {
      filename: "tokens.css",
      language: "css",
      content: ":root {\n  --bg: #14120e;\n  --fg: #f4ecdf;\n  --muted: #a89880;\n  --accent: #e39b3a;\n}\n",
    },
  },
  {
    id: "seed-notes",
    slug: "raw-notes",
    title: "الرابط الخام",
    summary: "كيف تحمّل ملفًا من راوي.",
    handle: "layan",
    tags: "docs",
    license: "Unlicense",
    stars: 7,
    views: 22,
    ago: "-12 hours",
    file: {
      filename: "README.md",
      language: "markdown",
      content: "# رابط خام\n\nGET /raw/raw-notes\nGET /raw/raw-notes/README.md\n\ncurl -fsSL يحمّل النص كما هو.\n",
    },
  },
];

let ready = null;

function uid() {
  return crypto.randomUUID();
}

function hexToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function slugify(title) {
  const ascii = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
  return (ascii || "script") + "-" + hexToken().slice(0, 6);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function fail(message, status = 400) {
  return json({ error: message }, status);
}

async function ensure(env) {
  if (!ready) {
    ready = (async () => {
      for (const statement of DDL) await env.DB.prepare(statement).run();
      const row = await env.DB.prepare("select count(*) as n from scripts").first();
      if (!row || Number(row.n) === 0) await seedAll(env);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function seedAll(env) {
  const stmts = [];
  for (const seed of SEEDS) {
    stmts.push(
      env.DB.prepare(
        `insert into scripts (id, slug, title, summary, handle, tags, license, stars, views, edit_token, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`,
      ).bind(
        seed.id,
        seed.slug,
        seed.title,
        seed.summary,
        seed.handle,
        seed.tags,
        seed.license,
        seed.stars,
        seed.views,
        hexToken(),
        seed.ago,
        seed.ago,
      ),
    );
    stmts.push(
      env.DB.prepare(
        `insert into script_files (id, script_id, filename, language, content, position) values (?, ?, ?, ?, ?, 0)`,
      ).bind(seed.id + "-file", seed.id, seed.file.filename, seed.file.language, seed.file.content),
    );
    stmts.push(
      env.DB.prepare(
        `insert into script_revisions (id, script_id, message, created_at) values (?, ?, ?, datetime('now', ?))`,
      ).bind(seed.id + "-rev", seed.id, "نشر أول نسخة", seed.ago),
    );
  }
  await env.DB.batch(stmts);
}

const CARD = `s.slug, s.title, s.summary, s.handle, s.tags, s.license, s.stars, s.forks, s.views, s.updated_at,
  (select f.filename from script_files f where f.script_id = s.id order by f.position limit 1) as lead_file,
  (select f.language from script_files f where f.script_id = s.id order by f.position limit 1) as lead_lang,
  (select substr(replace(replace(f.content, char(10), ' '), char(13), ' '), 1, 180)
     from script_files f where f.script_id = s.id order by f.position limit 1) as lead_preview,
  (select count(*) from script_files f where f.script_id = s.id) as file_count`;

function mapCard(row) {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary || "",
    handle: row.handle,
    tags: String(row.tags || "").split(",").filter(Boolean),
    license: row.license,
    stars: Number(row.stars || 0),
    forks: Number(row.forks || 0),
    views: Number(row.views || 0),
    updatedAt: String(row.updated_at || "").slice(0, 10),
    leadFile: row.lead_file || "file.txt",
    leadLang: row.lead_lang || "text",
    leadPreview: String(row.lead_preview || "").trim(),
    fileCount: Number(row.file_count || 1),
  };
}

function cleanDraft(input) {
  if (!input || !Array.isArray(input.files)) throw new Error("بيانات ناقصة");
  const title = String(input.title || "").trim().replace(/\s+/g, " ");
  if (title.length < 2 || title.length > 80) throw new Error("العنوان من حرفين إلى 80");
  const summary = String(input.summary || "").trim().slice(0, 500);
  let handle = String(input.handle || "").trim().replace(/\s+/g, "-");
  if (!handle) handle = "guest";
  if (handle.includes("@") || !/^[\p{L}\p{N}_-]{2,20}$/u.test(handle)) {
    throw new Error("اسم القلم غير مقبول");
  }
  const tags = String(input.tags || "")
    .split(/[,،]/)
    .map((tag) => tag.trim().replace(/\s+/g, "-"))
    .filter(Boolean)
    .slice(0, 5);
  for (const tag of tags) {
    if (!/^[\p{L}\p{N}_-]{1,16}$/u.test(tag)) throw new Error("وسم غير مقبول");
  }
  const license = LICENSES.includes(input.license) ? input.license : "MIT";
  const message = String(input.message || "").trim().slice(0, 140);
  if (input.files.length < 1 || input.files.length > 6) throw new Error("من ملف واحد إلى ستة");
  const seen = new Set();
  const files = input.files.map((file) => {
    const filename = String(file.filename || "").trim();
    if (!/^[\w.\-\u0600-\u06FF]{1,64}$/.test(filename) || filename.includes("..") || filename.startsWith(".")) {
      throw new Error("اسم الملف غير مقبول");
    }
    const key = filename.toLowerCase();
    if (seen.has(key)) throw new Error("اسم الملف مكرر");
    seen.add(key);
    if (!LANGS.includes(file.language)) throw new Error("لغة غير مدعومة");
    const content = String(file.content || "").replace(/\u0000/g, "");
    if (!content.trim() || content.length > 60000) throw new Error("حجم الملف غير مقبول");
    return { filename, language: file.language, content };
  });
  return { title, summary, handle, tags: tags.join(","), license, message, files };
}

async function listRows(env, whereSql, params, orderSql) {
  const result = await env.DB.prepare(
    `select ${CARD} from scripts s where ${whereSql} order by ${orderSql} limit 48`,
  ).bind(...params).all();
  return (result.results || []).map(mapCard);
}

async function readScript(env, slug, bump) {
  const row = await env.DB.prepare(
    `select id, slug, title, summary, handle, tags, license, stars, forks, views, updated_at, forked_from
     from scripts where slug = ?`,
  ).bind(slug).first();
  if (!row) return null;
  if (bump) await env.DB.prepare("update scripts set views = views + 1 where id = ?").bind(row.id).run();
  const files = await env.DB.prepare(
    "select filename, language, content from script_files where script_id = ? order by position",
  ).bind(row.id).all();
  const revisions = await env.DB.prepare(
    "select message, created_at from script_revisions where script_id = ? order by created_at desc limit 12",
  ).bind(row.id).all();
  const list = files.results || [];
  return {
    ...mapCard({
      ...row,
      lead_file: list[0]?.filename,
      lead_lang: list[0]?.language,
      lead_preview: "",
      file_count: list.length,
    }),
    forkedFrom: row.forked_from || null,
    files: list,
    revisions: (revisions.results || []).map((rev) => ({
      message: rev.message,
      createdAt: String(rev.created_at || "").slice(0, 10),
    })),
  };
}

async function insertBundle(env, draft, forkedFrom) {
  const note = draft.message || (forkedFrom ? "تفرّع" : "نشر أول نسخة");
  let last = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = uid();
    const slug = slugify(draft.title);
    const editToken = hexToken();
    try {
      const stmts = [
        env.DB.prepare(
          `insert into scripts (id, slug, title, summary, handle, tags, license, forked_from, edit_token)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(id, slug, draft.title, draft.summary, draft.handle, draft.tags, draft.license, forkedFrom, editToken),
      ];
      draft.files.forEach((file, index) => {
        stmts.push(
          env.DB.prepare(
            "insert into script_files (id, script_id, filename, language, content, position) values (?, ?, ?, ?, ?, ?)",
          ).bind(uid(), id, file.filename, file.language, file.content, index),
        );
      });
      stmts.push(
        env.DB.prepare("insert into script_revisions (id, script_id, message) values (?, ?, ?)").bind(uid(), id, note),
      );
      await env.DB.batch(stmts);
      return { slug, editToken };
    } catch (error) {
      last = error;
      if (!/unique/i.test(String(error))) throw error;
    }
  }
  throw last || new Error("تعذّر توليد الرابط");
}

function mimeFor(language) {
  if (language === "javascript") return "text/javascript; charset=utf-8";
  if (language === "css") return "text/css; charset=utf-8";
  if (language === "json") return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

async function rawResponse(env, slug, filename) {
  const files = await env.DB.prepare(
    `select f.filename, f.language, f.content
     from script_files f join scripts s on s.id = f.script_id
     where s.slug = ? order by f.position`,
  ).bind(slug).all();
  const list = files.results || [];
  if (!list.length) return new Response("not found\n", { status: 404 });
  const file = filename ? list.find((item) => item.filename === filename) : list[0];
  if (!file) return new Response("not found\n", { status: 404 });
  await env.DB.prepare("update scripts set views = views + 1 where slug = ?").bind(slug).run();
  return new Response(file.content, {
    headers: {
      "content-type": mimeFor(file.language),
      "x-content-type-options": "nosniff",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=30",
    },
  });
}

async function api(request, env, url) {
  const path = url.pathname;
  if (request.method === "GET" && path === "/api/home") {
    const stats = await env.DB.prepare(
      `select
         (select count(*) from scripts) as scripts,
         (select count(*) from script_files) as files,
         (select coalesce(sum(stars), 0) from scripts) as stars`,
    ).first();
    const recent = await listRows(env, "1 = 1", [], "s.updated_at desc");
    const loved = await listRows(env, "1 = 1", [], "s.stars desc, s.views desc");
    return json({
      stats: {
        scripts: Number(stats?.scripts || 0),
        files: Number(stats?.files || 0),
        stars: Number(stats?.stars || 0),
      },
      recent: recent.slice(0, 8),
      loved: loved.slice(0, 6),
    });
  }
  if (request.method === "GET" && path === "/api/list") {
    const q = (url.searchParams.get("q") || "").replace(/[%_\\]/g, "").trim().slice(0, 60);
    const lang = LANGS.includes(url.searchParams.get("lang") || "") ? url.searchParams.get("lang") : "";
    const sort = url.searchParams.get("sort") === "stars" ? "stars" : "new";
    const like = "%" + q.toLowerCase() + "%";
    const rows = await listRows(
      env,
      `(? = '' or lower(s.title) like ? or lower(s.summary) like ? or lower(s.tags) like ? or lower(s.handle) like ? or lower(s.slug) like ?
        or exists (select 1 from script_files f where f.script_id = s.id and lower(f.filename) like ?))
       and (? = '' or exists (select 1 from script_files f where f.script_id = s.id and f.language = ?))`,
      [q, like, like, like, like, like, like, lang, lang],
      sort === "stars" ? "s.stars desc, s.updated_at desc" : "s.updated_at desc",
    );
    const langs = await env.DB.prepare(
      "select language, count(distinct script_id) as n from script_files group by language order by n desc",
    ).all();
    return json({
      scripts: rows,
      langs: (langs.results || []).map((row) => ({ language: row.language, n: Number(row.n || 0) })),
    });
  }
  if (request.method === "GET" && path === "/api/script") {
    const detail = await readScript(env, url.searchParams.get("slug") || "", true);
    if (!detail) return fail("السكربت غير موجود", 404);
    return json(detail);
  }
  if (request.method !== "POST") return fail("method", 405);
  let body = {};
  try {
    body = await request.json();
  } catch {
    return fail("JSON غير صالح");
  }
  try {
    if (path === "/api/publish") {
      return json(await insertBundle(env, cleanDraft(body.draft || body), null));
    }
    if (path === "/api/save") {
      const draft = cleanDraft(body.draft);
      const token = String(body.editToken || "");
      const row = await env.DB.prepare("select id, edit_token from scripts where slug = ?").bind(body.slug).first();
      if (!row) return fail("السكربت غير موجود", 404);
      if (row.edit_token !== token) return fail("رمز التحرير غير صحيح", 403);
      const stmts = [
        env.DB.prepare(
          "update scripts set title = ?, summary = ?, handle = ?, tags = ?, license = ?, updated_at = datetime('now') where id = ?",
        ).bind(draft.title, draft.summary, draft.handle, draft.tags, draft.license, row.id),
        env.DB.prepare("delete from script_files where script_id = ?").bind(row.id),
      ];
      draft.files.forEach((file, index) => {
        stmts.push(
          env.DB.prepare(
            "insert into script_files (id, script_id, filename, language, content, position) values (?, ?, ?, ?, ?, ?)",
          ).bind(uid(), row.id, file.filename, file.language, file.content, index),
        );
      });
      stmts.push(
        env.DB.prepare("insert into script_revisions (id, script_id, message) values (?, ?, ?)").bind(
          uid(),
          row.id,
          draft.message || "تحديث",
        ),
      );
      await env.DB.batch(stmts);
      return json({ ok: true });
    }
    if (path === "/api/remove") {
      const row = await env.DB.prepare("select id, edit_token from scripts where slug = ?").bind(body.slug).first();
      if (!row || row.edit_token !== String(body.editToken || "")) return fail("تعذّر الحذف", 403);
      await env.DB.batch([
        env.DB.prepare("delete from script_stars where script_id = ?").bind(row.id),
        env.DB.prepare("delete from script_revisions where script_id = ?").bind(row.id),
        env.DB.prepare("delete from script_files where script_id = ?").bind(row.id),
        env.DB.prepare("delete from scripts where id = ?").bind(row.id),
      ]);
      return json({ ok: true });
    }
    if (path === "/api/fork") {
      const parent = await readScript(env, String(body.slug || ""), false);
      if (!parent) return fail("السكربت غير موجود", 404);
      const created = await insertBundle(
        env,
        cleanDraft({
          title: parent.title,
          summary: parent.summary,
          handle: body.handle || "guest",
          tags: parent.tags.join(","),
          license: parent.license,
          message: "تفرّع",
          files: parent.files,
        }),
        parent.slug,
      );
      await env.DB.prepare("update scripts set forks = forks + 1 where slug = ?").bind(parent.slug).run();
      return json(created);
    }
    if (path === "/api/star") {
      const voter = String(body.voter || "");
      if (!/^[a-zA-Z0-9-]{8,80}$/.test(voter)) return fail("معرّف غير صالح");
      const row = await env.DB.prepare("select id from scripts where slug = ?").bind(body.slug).first();
      if (!row) return fail("السكربت غير موجود", 404);
      const existing = await env.DB.prepare(
        "select 1 as x from script_stars where script_id = ? and voter_key = ?",
      ).bind(row.id, voter).first();
      if (body.on && !existing) {
        await env.DB.prepare("insert into script_stars (script_id, voter_key) values (?, ?)").bind(row.id, voter).run();
        await env.DB.prepare("update scripts set stars = stars + 1 where id = ?").bind(row.id).run();
      } else if (!body.on && existing) {
        await env.DB.prepare("delete from script_stars where script_id = ? and voter_key = ?").bind(row.id, voter).run();
        await env.DB.prepare("update scripts set stars = max(stars - 1, 0) where id = ?").bind(row.id).run();
      }
      const stars = await env.DB.prepare("select stars from scripts where id = ?").bind(row.id).first();
      return json({ stars: Number(stars?.stars || 0) });
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "تعذّر إكمال العملية");
  }
  return fail("not found", 404);
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#e39b3a"/><path d="M9 23V9h3.2l3.9 8.2L20 9H23v14h-2.6v-8.7L16.6 23h-1.2l-3.8-8.7V23H9z" fill="#1a140c"/></svg>`;

const PAGE = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>راوي</title>
  <link rel="icon" href="/favicon.svg" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" />
  <style>
    :root { color-scheme: dark; --bg:#14120e; --surface:#1e1b16; --raised:#28241c; --fg:#f4ecdf; --muted:#a89880; --line:#3c3428; --accent:#e39b3a; --ink:#1a140c; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--bg); color: var(--fg); font-family: "IBM Plex Sans Arabic", sans-serif; line-height: 1.55; }
    a { color: inherit; text-decoration: none; }
    button, .btn { min-height: 44px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); color: var(--fg); font: inherit; padding: 0 14px; cursor: pointer; }
    .btn.primary, button.primary { background: var(--accent); color: var(--ink); border-color: var(--accent); font-weight: 600; }
    input, textarea, select { width: 100%; min-height: 44px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); font: inherit; padding: 8px 12px; }
    textarea { min-height: 220px; font-family: "IBM Plex Mono", ui-monospace, monospace; direction: ltr; text-align: left; }
    header { position: sticky; top: 0; background: var(--bg); border-bottom: 1px solid var(--line); }
    .bar { height: 4px; background: var(--accent); }
    .wrap { max-width: 72rem; margin: 0 auto; padding: 0 16px; }
    .row { display: flex; align-items: center; gap: 8px; min-height: 64px; }
    nav { margin-inline-start: auto; display: flex; gap: 4px; align-items: center; }
    main { padding: 24px 0 48px; }
    .card { border: 1px solid var(--line); background: var(--surface); border-radius: 8px; }
    .item { display: block; padding: 16px; border-bottom: 1px solid var(--line); }
    .item:last-child { border-bottom: 0; }
    .muted { color: var(--muted); }
    .accent { color: var(--accent); }
    .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stat { padding: 12px; }
    .stat b { display: block; font-family: "IBM Plex Mono", monospace; font-size: 1.5rem; }
    h1 { font-size: 1.8rem; line-height: 1.25; margin: 0; }
    .code { overflow-x: auto; direction: ltr; background: var(--bg); }
    .code table { width: 100%; border-collapse: collapse; font-family: "IBM Plex Mono", monospace; font-size: 13px; }
    .code td.n { width: 3rem; text-align: right; color: var(--muted); border-left: 2px solid var(--accent); padding: 0 10px; user-select: none; }
    .code td.c { white-space: pre; padding-inline-end: 12px; }
    .kw, .num { color: var(--accent); } .cmt { color: var(--muted); } .str { font-style: italic; }
    .grid { display: grid; gap: 16px; }
    @media (min-width: 900px) { .split { grid-template-columns: minmax(0,1fr) 240px; } }
    footer { border-top: 1px solid var(--line); color: var(--muted); padding: 24px 0; }
    .err { color: var(--accent); }
    .hide-sm { display: none; }
    @media (min-width: 640px) { .hide-sm { display: inline-flex; } .short { display: none; } }
  </style>
</head>
<body>
  <div class="bar"></div>
  <header><div class="wrap row">
    <a href="/"><b class="mono" style="background:var(--accent);color:var(--ink);border-radius:6px;padding:6px 8px">R</b> راوي</a>
    <nav>
      <a href="/explore">استكشف</a>
      <a class="btn primary" href="/new"><span class="short">جديد</span><span class="hide-sm">سكربت جديد</span></a>
    </nav>
  </div></header>
  <main><div class="wrap" id="app">جارٍ الفتح…</div></main>
  <footer><div class="wrap">راوي على Cloudflare Workers — روابط خام عامة، ورمز تحرير في هذا المتصفح.</div></footer>
  <script src="/app.js" defer></script>
</body>
</html>`;

const CLIENT = `
var app = document.getElementById("app");
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c];
  });
}
function voter() {
  var key = localStorage.getItem("rawi-voter");
  if (key && /^[a-zA-Z0-9-]{8,80}$/.test(key)) return key;
  key = crypto.randomUUID();
  localStorage.setItem("rawi-voter", key);
  return key;
}
function tokens() {
  try { return JSON.parse(localStorage.getItem("rawi-tokens") || "{}"); } catch (e) { return {}; }
}
function saveToken(slug, token) {
  var map = tokens();
  map[slug] = token;
  localStorage.setItem("rawi-tokens", JSON.stringify(map));
}
function readToken(slug) { return tokens()[slug] || ""; }
function saveHandle(handle) { localStorage.setItem("rawi-handle", handle || ""); }
function readHandle() { return localStorage.getItem("rawi-handle") || ""; }
function stars() {
  try { return new Set(JSON.parse(localStorage.getItem("rawi-starred") || "[]")); } catch (e) { return new Set(); }
}
function writeStar(slug, on) {
  var set = stars();
  if (on) set.add(slug); else set.delete(slug);
  localStorage.setItem("rawi-starred", JSON.stringify(Array.from(set)));
}
async function api(path, body) {
  var res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || "تعذّر إكمال العملية");
  return data;
}
function listHtml(scripts) {
  if (!scripts.length) return '<div class="card" style="padding:24px">لا توجد سكربتات.</div>';
  return '<div class="card">' + scripts.map(function (s) {
    return '<a class="item" href="/s/' + esc(s.slug) + '"><div class="accent mono" style="font-size:12px">' + esc(s.leadLang) + '</div><div style="display:flex;justify-content:space-between;gap:12px"><b>' + esc(s.title) + '</b><span class="mono muted">' + esc(s.stars) + '</span></div><div class="muted" style="font-size:14px">' + esc(s.handle) + ' · <span class="mono" dir="ltr">' + esc(s.leadFile) + '</span> · ' + esc(s.updatedAt) + '</div><div class="mono muted" dir="ltr" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.leadPreview) + '</div></a>';
  }).join("") + '</div>';
}
var KW = { javascript: "const let var function return if else for while new class import export from async await try catch throw true false null", typescript: "const let function return if else interface type import export from async await", python: "def return if elif else for while import from class try except True False None", lua: "function end local if then else return true false nil", shell: "if then else fi for do done echo", css: "", sql: "select from where order by limit", markdown: "", text: "", json: "", html: "", go: "func return if else package", rust: "fn let mut pub return if else" };
function paint(line, lang) {
  var words = new Set((KW[lang] || "").split(" "));
  var html = "";
  var i = 0;
  function push(cls, v) { html += cls ? '<span class="' + cls + '">' + esc(v) + '</span>' : esc(v); }
  while (i < line.length) {
    var rest = line.slice(i);
    if ((lang === "javascript" || lang === "typescript") && rest.indexOf("//") === 0) { push("cmt", rest); break; }
    if ((lang === "python" || lang === "shell") && rest[0] === "#") { push("cmt", rest); break; }
    var ch = line[i];
    if (ch === '"' || ch === "'" || ch === "\u0060") {
      var j = i + 1;
      while (j < line.length && line[j] !== ch) j += 1;
      push("str", line.slice(i, Math.min(line.length, j + 1)));
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      var k = i + 1;
      while (k < line.length && /[A-Za-z0-9_]/.test(line[k])) k += 1;
      var word = line.slice(i, k);
      push(words.has(word) ? "kw" : "", word);
      i = k;
      continue;
    }
    push("", ch);
    i += 1;
  }
  return html || " ";
}
function codeHtml(content, lang) {
  var lines = String(content).replace(/\\r\\n/g, "\\n").split("\\n");
  return '<div class="code"><table><tbody>' + lines.map(function (line, idx) {
    return '<tr><td class="n">' + (idx + 1) + '</td><td class="c">' + paint(line, lang) + '</td></tr>';
  }).join("") + '</tbody></table></div>';
}
function field(label, html) { return '<label class="grid" style="gap:6px;font-size:14px">' + label + html + '</label>'; }
async function showHome() {
  var data = await api("/api/home");
  app.innerHTML = '<p class="accent mono" style="font-size:12px">RAWI / WORKERS</p><h1 style="margin-top:8px">مستودع السكربتات</h1><p class="muted">هذه النسخة تعمل على Cloudflare Workers وقاعدة D1. الرابط الخام يبقى عامًا.</p><div class="stats" style="margin-top:16px"><div class="card stat"><span class="muted">سكربتات</span><b>' + data.stats.scripts + '</b></div><div class="card stat"><span class="muted">ملفات</span><b>' + data.stats.files + '</b></div><div class="card stat"><span class="muted">نجوم</span><b>' + data.stats.stars + '</b></div></div><h2 style="margin-top:28px">الأحدث</h2>' + listHtml(data.recent);
}
async function showExplore() {
  var params = new URLSearchParams(location.search);
  var data = await api("/api/list?" + params.toString());
  app.innerHTML = '<h1>استكشف</h1><form style="display:flex;gap:8px;margin:16px 0" action="/explore"><input class="min" name="q" value="' + esc(params.get("q") || "") + '" placeholder="بحث" /><button class="primary" type="submit">بحث</button></form>' + listHtml(data.scripts);
}
function draftFromForm(form) {
  var data = new FormData(form);
  return {
    title: data.get("title"),
    summary: data.get("summary"),
    handle: data.get("handle"),
    tags: data.get("tags"),
    license: data.get("license"),
    message: data.get("message"),
    files: [{ filename: data.get("filename"), language: data.get("language"), content: data.get("content") }]
  };
}
async function showNew() {
  app.innerHTML = '<h1>سكربت جديد</h1><p class="muted">رمز التحرير سيُحفظ في هذا المتصفح.</p><form id="pub" class="grid" style="margin-top:16px">' +
    field("العنوان", '<input name="title" required maxlength="80" />') +
    field("الوصف", '<textarea name="summary" style="min-height:80px"></textarea>') +
    field("اسم القلم", '<input name="handle" maxlength="20" value="' + esc(readHandle()) + '" />') +
    field("ملف", '<input class="mono" dir="ltr" name="filename" value="main.js" />') +
    field("اللغة", '<select name="language"><option>javascript</option><option>typescript</option><option>python</option><option>lua</option><option>shell</option><option>css</option><option>json</option><option>sql</option><option>markdown</option><option>text</option></select>') +
    field("المحتوى", '<textarea name="content" required></textarea>') +
    '<button class="primary" type="submit">نشر</button><p class="err" id="err"></p></form>';
  document.getElementById("pub").onsubmit = async function (event) {
    event.preventDefault();
    try {
      var draft = draftFromForm(event.target);
      var created = await api("/api/publish", { draft: draft });
      saveToken(created.slug, created.editToken);
      saveHandle(draft.handle);
      sessionStorage.setItem("rawi-just", created.slug);
      location.href = "/s/" + created.slug;
    } catch (error) {
      document.getElementById("err").textContent = error.message;
    }
  };
}
async function showScript(slug) {
  var data;
  try { data = await api("/api/script?slug=" + encodeURIComponent(slug)); }
  catch (error) { app.innerHTML = "<h1>السكربت غير موجود</h1>"; return; }
  var file = data.files[0];
  var path = location.origin + "/raw/" + data.slug + "/" + encodeURIComponent(file.filename);
  var banner = sessionStorage.getItem("rawi-just") === slug ? readToken(slug) : "";
  if (banner) sessionStorage.removeItem("rawi-just");
  var starred = stars().has(slug);
  app.innerHTML = '<p class="muted mono">' + esc(data.handle) + ' / ' + esc(data.slug) + '</p><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px"><h1>' + esc(data.title) + '</h1><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="star" class="' + (starred ? "primary" : "") + '">نجمة ' + data.stars + '</button><button id="fork">تفرّع</button><a class="btn" href="/s/' + esc(data.slug) + '/edit">تعديل</a></div></div><p class="muted">' + esc(data.summary) + '</p>' +
    (banner ? '<div class="card" style="padding:12px;margin-top:12px">رمز التحرير: <span class="mono accent" dir="ltr">' + esc(banner) + '</span></div>' : "") +
    '<div class="card" style="margin-top:16px"><div style="padding:8px 12px" class="mono accent">' + esc(file.filename) + '</div>' + codeHtml(file.content, file.language) + '</div>' +
    '<div class="card" style="padding:12px;margin-top:12px"><div class="mono" dir="ltr" style="overflow-x:auto">curl -fsSL ' + esc(path) + '</div></div><p class="err" id="err"></p>';
  document.getElementById("star").onclick = async function () {
    try {
      var on = !stars().has(slug);
      await api("/api/star", { slug: slug, voter: voter(), on: on });
      writeStar(slug, on);
      showScript(slug);
    } catch (error) { document.getElementById("err").textContent = error.message; }
  };
  document.getElementById("fork").onclick = async function () {
    try {
      var created = await api("/api/fork", { slug: slug, handle: readHandle() || "guest" });
      saveToken(created.slug, created.editToken);
      sessionStorage.setItem("rawi-just", created.slug);
      location.href = "/s/" + created.slug;
    } catch (error) { document.getElementById("err").textContent = error.message; }
  };
}
async function showEdit(slug) {
  var data = await api("/api/script?slug=" + encodeURIComponent(slug));
  var token = readToken(slug);
  var file = data.files[0] || { filename: "main.js", language: "javascript", content: "" };
  app.innerHTML = '<h1>تعديل</h1><form id="ed" class="grid" style="margin-top:16px">' +
    field("رمز التحرير", '<input class="mono" dir="ltr" name="token" value="' + esc(token) + '" required />') +
    field("العنوان", '<input name="title" value="' + esc(data.title) + '" required />') +
    field("الوصف", '<textarea name="summary" style="min-height:80px">' + esc(data.summary) + '</textarea>') +
    field("اسم القلم", '<input name="handle" value="' + esc(data.handle) + '" />') +
    field("ملف", '<input class="mono" dir="ltr" name="filename" value="' + esc(file.filename) + '" />') +
    field("اللغة", '<input name="language" value="' + esc(file.language) + '" />') +
    field("المحتوى", '<textarea name="content">' + esc(file.content) + '</textarea>') +
    '<button class="primary" type="submit">حفظ</button><button type="button" id="del">حذف</button><p class="err" id="err"></p></form>';
  document.getElementById("ed").onsubmit = async function (event) {
    event.preventDefault();
    var draft = draftFromForm(event.target);
    var editToken = new FormData(event.target).get("token");
    try {
      await api("/api/save", { slug: slug, editToken: editToken, draft: draft });
      saveToken(slug, editToken);
      location.href = "/s/" + slug;
    } catch (error) { document.getElementById("err").textContent = error.message; }
  };
  document.getElementById("del").onclick = async function () {
    var editToken = document.querySelector('[name="token"]').value;
    try {
      await api("/api/remove", { slug: slug, editToken: editToken });
      location.href = "/";
    } catch (error) { document.getElementById("err").textContent = error.message; }
  };
}
async function boot() {
  var parts = location.pathname.split("/").filter(Boolean);
  try {
    if (!parts.length) return await showHome();
    if (parts[0] === "explore") return await showExplore();
    if (parts[0] === "new") return await showNew();
    if (parts[0] === "s" && parts[1] && parts[2] === "edit") return await showEdit(decodeURIComponent(parts[1]));
    if (parts[0] === "s" && parts[1]) return await showScript(decodeURIComponent(parts[1]));
    app.innerHTML = "<h1>الصفحة غير موجودة</h1>";
  } catch (error) {
    app.innerHTML = '<p class="err">' + esc(error.message) + '</p>';
  }
}
document.addEventListener("click", function (event) {
  var link = event.target.closest("a");
  if (!link || link.origin !== location.origin) return;
  if (link.pathname.indexOf("/raw/") === 0) return;
  event.preventDefault();
  history.pushState({}, "", link.pathname + link.search);
  boot();
});
window.addEventListener("popstate", boot);
boot();
`;

const SETUP = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>راوي</title><body style="font-family:sans-serif;background:#14120e;color:#f4ecdf;padding:32px"><h1>اربط قاعدة D1</h1><p>أنشئ قاعدة باسم rawi واربطها بالـ Worker تحت الاسم <b>DB</b> ثم أعد النشر. الجداول تُنشأ عند أول طلب.</p></body></html>`;

export { CLIENT };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/favicon.svg") {
      return new Response(FAVICON, { headers: { "content-type": "image/svg+xml" } });
    }
    if (url.pathname === "/app.js") {
      return new Response(CLIENT, {
        headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=300" },
      });
    }
    if (!env || !env.DB) {
      return new Response(SETUP, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    try {
      await ensure(env);
    } catch (error) {
      return new Response("database setup failed\n" + (error instanceof Error ? error.message : ""), {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    if (url.pathname.startsWith("/raw/")) {
      const bits = url.pathname.split("/").filter(Boolean);
      const slug = decodeURIComponent(bits[1] || "");
      const filename = bits[2] ? decodeURIComponent(bits.slice(2).join("/")) : undefined;
      return rawResponse(env, slug, filename);
    }
    if (url.pathname.startsWith("/api/")) return api(request, env, url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method\n", { status: 405 });
    }
    return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
  },
};
