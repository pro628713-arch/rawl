create table if not exists scripts (
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
  edit_token text not null default md5(random()::text || clock_timestamp()::text),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists script_files (
  id text primary key,
  script_id text not null references scripts(id) on delete cascade,
  filename text not null,
  language text not null,
  content text not null,
  position integer not null default 0,
  unique (script_id, filename)
);

create table if not exists script_revisions (
  id text primary key,
  script_id text not null references scripts(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists script_stars (
  script_id text not null references scripts(id) on delete cascade,
  voter_key text not null,
  primary key (script_id, voter_key)
);

create index if not exists scripts_updated_idx on scripts (updated_at desc);
create index if not exists script_files_script_idx on script_files (script_id, position);

insert into scripts (id, slug, title, summary, handle, tags, license, stars, forks, views, created_at, updated_at)
values
  ('seed-debounce', 'debounce-hook', 'مهلة الكتابة', 'دالة debounce بلا اعتماديات، للبحث والأزرار.', 'mira', 'ui,events', 'MIT', 42, 3, 180, now() - interval '6 days', now() - interval '1 day'),
  ('seed-retry', 'retry-backoff', 'إعادة المحاولة', 'جلب HTTP مع تراجع أسي في بايثون القياسي.', 'karam', 'http,python', 'Apache-2.0', 36, 2, 140, now() - interval '9 days', now() - interval '2 days'),
  ('seed-slug', 'unicode-slug', 'رابط نظيف', 'يصنع slug من العربي والإنجليزي بدون مكتبات.', 'layan', 'text,url', 'MIT', 28, 1, 96, now() - interval '3 days', now() - interval '3 hours'),
  ('seed-tokens', 'rawi-tokens', 'رموز راوي', 'متغيرات اللون والخط نفسها المستخدمة في الواجهة.', 'studio', 'css,theme', 'MIT', 19, 0, 70, now() - interval '4 days', now() - interval '4 days'),
  ('seed-backup', 'nightly-backup', 'نسخة ليلية', 'أرشفة مجلد مع تاريخ في اسم الملف.', 'mira', 'shell,ops', 'ISC', 15, 1, 54, now() - interval '12 days', now() - interval '5 days'),
  ('seed-rank', 'rank-scripts', 'ترتيب المستودع', 'استعلام يرتّب السكربتات بالنجوم ثم الحداثة.', 'karam', 'sql', 'MIT', 11, 0, 40, now() - interval '2 days', now() - interval '6 hours'),
  ('seed-ease', 'ease-step', 'تسهيل الحركة', 'lerp و smoothstep للألعاب والأدوات، بلا محرّكات غش.', 'layan', 'lua,motion', 'MIT', 9, 0, 33, now() - interval '15 days', now() - interval '8 days'),
  ('seed-notes', 'raw-notes', 'كيف تستخدم الرابط الخام', 'ملاحظات قصيرة لتحميل ملف من راوي.', 'studio', 'docs', 'Unlicense', 7, 0, 22, now() - interval '1 day', now() - interval '12 hours')
on conflict (id) do nothing;

insert into script_files (id, script_id, filename, language, content, position)
values
  ('file-debounce', 'seed-debounce', 'debounce.ts', 'typescript', $s1$export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait = 200,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
$s1$, 0),
  ('file-retry', 'seed-retry', 'retry.py', 'python', $s2$import time
from urllib import request

def fetch(url: str, attempts: int = 4, timeout: int = 8) -> bytes:
    delay = 0.4
    last = None
    for _ in range(attempts):
        try:
            with request.urlopen(url, timeout=timeout) as res:
                return res.read()
        except Exception as exc:
            last = exc
            time.sleep(delay)
            delay *= 2
    raise RuntimeError("failed after retries") from last
$s2$, 0),
  ('file-slug', 'seed-slug', 'slug.js', 'javascript', $s3$export function slugify(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
$s3$, 0),
  ('file-tokens', 'seed-tokens', 'tokens.css', 'css', $s4$:root {
  --bg: #14120e;
  --surface: #1e1b16;
  --fg: #f4ecdf;
  --muted: #a89880;
  --line: #3c3428;
  --accent: #e39b3a;
  --accent-ink: #1a140c;
  --sans: "IBM Plex Sans Arabic", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
}
$s4$, 0),
  ('file-backup', 'seed-backup', 'backup.sh', 'shell', $s5$#!/bin/sh
set -eu
src="${1:-.}"
dest="${2:-./backups}"
stamp="$(date +%Y%m%d-%H%M)"
mkdir -p "$dest"
archive="$dest/backup-$stamp.tar.gz"
tar -czf "$archive" -C "$src" .
printf 'wrote %s\n' "$archive"
$s5$, 0),
  ('file-rank', 'seed-rank', 'rank.sql', 'sql', $s6$select slug, title, stars, views
from scripts
order by stars desc, updated_at desc
limit 20;
$s6$, 0),
  ('file-ease', 'seed-ease', 'ease.lua', 'lua', $s7$local ease = {}

function ease.lerp(a, b, t)
  return a + (b - a) * t
end

function ease.smoothstep(t)
  local x = math.min(1, math.max(0, t))
  return x * x * (3 - 2 * x)
end

return ease
$s7$, 0),
  ('file-notes', 'seed-notes', 'README.md', 'markdown', $s8$# رابط خام

الملف الأساسي:
GET /raw/raw-notes

ملف باسمه:
GET /raw/raw-notes/README.md

curl -fsSL يحمّل النص كما هو.
سكربت JavaScript يُخدم كـ text/javascript
ويمكن وضعه في src.
صفحات HTML لا تُخدم كصفحات، حتى لا تُنفَّذ داخل الموقع.
$s8$, 0)
on conflict (id) do nothing;

insert into script_revisions (id, script_id, message, created_at)
values
  ('rev-debounce', 'seed-debounce', 'نشر أول نسخة', now() - interval '6 days'),
  ('rev-retry', 'seed-retry', 'نشر أول نسخة', now() - interval '9 days'),
  ('rev-slug', 'seed-slug', 'نشر أول نسخة', now() - interval '3 days'),
  ('rev-tokens', 'seed-tokens', 'نشر أول نسخة', now() - interval '4 days'),
  ('rev-backup', 'seed-backup', 'نشر أول نسخة', now() - interval '12 days'),
  ('rev-rank', 'seed-rank', 'نشر أول نسخة', now() - interval '2 days'),
  ('rev-ease', 'seed-ease', 'نشر أول نسخة', now() - interval '15 days'),
  ('rev-notes', 'seed-notes', 'نشر أول نسخة', now() - interval '1 day')
on conflict (id) do nothing;
