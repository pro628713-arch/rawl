import { randomBytes, randomUUID } from "node:crypto";
import { notFound } from "@tanstack/react-router";
import { getSql, type Sql } from "@/lib/db";
import {
  cleanDraft,
  type CleanDraft,
  type Draft,
  type ScriptCard,
  type ScriptDetail,
  UserError,
} from "@/lib/script-model";

const CARD = `
  s.slug,
  s.title,
  s.summary,
  s.handle,
  s.tags,
  s.license,
  s.stars,
  s.forks,
  s.views,
  s.updated_at,
  (select f.filename from script_files f where f.script_id = s.id order by f.position asc limit 1) as lead_file,
  (select f.language from script_files f where f.script_id = s.id order by f.position asc limit 1) as lead_lang,
  (select left(replace(replace(f.content, chr(10), ' '), chr(13), ' '), 180)
     from script_files f where f.script_id = s.id order by f.position asc limit 1) as lead_preview,
  (select count(*)::int from script_files f where f.script_id = s.id) as file_count
`;

function stamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const text = String(value ?? "");
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  return text.slice(0, 24);
}

function mapCard(row: Record<string, unknown>): ScriptCard {
  const tags = String(row.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    slug: String(row.slug),
    title: String(row.title),
    summary: String(row.summary ?? ""),
    handle: String(row.handle),
    tags,
    license: String(row.license),
    stars: Number(row.stars ?? 0),
    forks: Number(row.forks ?? 0),
    views: Number(row.views ?? 0),
    updatedAt: stamp(row.updated_at),
    leadFile: String(row.lead_file ?? "file.txt"),
    leadLang: String(row.lead_lang ?? "text"),
    leadPreview: String(row.lead_preview ?? "").trim(),
    fileCount: Number(row.file_count ?? 1),
  };
}

function isUnique(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && String((error as { code: unknown }).code) === "23505") return true;
  const message = error instanceof Error ? error.message : "";
  return /unique|duplicate/i.test(message);
}

function makeSlug(title: string): string {
  const ascii = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
  return `${ascii || "script"}-${randomBytes(3).toString("hex")}`;
}

async function insertBundle(
  sql: Sql,
  draft: CleanDraft,
  forkedFrom: string | null,
  message: string,
): Promise<{ slug: string; editToken: string }> {
  const editToken = randomBytes(18).toString("hex");
  const note = message || (forkedFrom ? "تفرّع" : "نشر أول نسخة");
  let last: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomUUID();
    const slug = makeSlug(draft.title);
    try {
      await sql.query(
        `insert into scripts (id, slug, title, summary, handle, tags, license, edit_token, forked_from)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id,
          slug,
          draft.title,
          draft.summary,
          draft.handle,
          draft.tags,
          draft.license,
          editToken,
          forkedFrom,
        ],
      );
      try {
        for (let index = 0; index < draft.files.length; index += 1) {
          const file = draft.files[index]!;
          await sql.query(
            `insert into script_files (id, script_id, filename, language, content, position)
             values ($1,$2,$3,$4,$5,$6)`,
            [randomUUID(), id, file.filename, file.language, file.content, index],
          );
        }
        await sql.query(`insert into script_revisions (id, script_id, message) values ($1,$2,$3)`, [
          randomUUID(),
          id,
          note,
        ]);
      } catch (error) {
        await sql.query(`delete from scripts where id = $1`, [id]);
        throw error;
      }
      return { slug, editToken };
    } catch (error) {
      last = error;
      if (isUnique(error) && attempt < 4) continue;
      throw error;
    }
  }
  throw last instanceof Error ? last : new UserError("تعذّر توليد الرابط");
}

export async function homeBundle(): Promise<{
  stats: { scripts: number; files: number; stars: number };
  recent: ScriptCard[];
  loved: ScriptCard[];
}> {
  const sql = await getSql();
  const statsRows = await sql.query<Record<string, unknown>>(
    `select
       (select count(*)::int from scripts) as scripts,
       (select count(*)::int from script_files) as files,
       (select coalesce(sum(stars), 0)::int from scripts) as stars`,
  );
  const recent = await sql.query<Record<string, unknown>>(
    `select ${CARD} from scripts s order by s.updated_at desc limit 8`,
  );
  const loved = await sql.query<Record<string, unknown>>(
    `select ${CARD} from scripts s order by s.stars desc, s.views desc limit 6`,
  );
  const stats = statsRows[0] ?? {};
  return {
    stats: {
      scripts: Number(stats.scripts ?? 0),
      files: Number(stats.files ?? 0),
      stars: Number(stats.stars ?? 0),
    },
    recent: recent.map(mapCard),
    loved: loved.map(mapCard),
  };
}

export async function exploreBundle(input: {
  q: string;
  lang: string;
  sort: "new" | "stars";
}): Promise<{ scripts: ScriptCard[]; langs: { language: string; n: number }[] }> {
  const sql = await getSql();
  const q = input.q.replace(/[%_\\]/g, "").trim().slice(0, 60);
  const lang = input.lang;
  const like = `%${q}%`;
  const order =
    input.sort === "stars" ? "s.stars desc, s.updated_at desc" : "s.updated_at desc";
  const rows = await sql.query<Record<string, unknown>>(
    `select ${CARD}
     from scripts s
     where ($1 = '' or s.title ilike $2 or s.summary ilike $2 or s.tags ilike $2
            or s.handle ilike $2 or s.slug ilike $2
            or exists (
              select 1 from script_files f
              where f.script_id = s.id and f.filename ilike $2
            ))
       and ($3 = '' or exists (
              select 1 from script_files f
              where f.script_id = s.id and f.language = $3
            ))
     order by ${order}
     limit 48`,
    [q, like, lang],
  );
  const langs = await sql.query<Record<string, unknown>>(
    `select language, count(distinct script_id)::int as n
     from script_files
     group by language
     order by n desc, language asc`,
  );
  return {
    scripts: rows.map(mapCard),
    langs: langs.map((row) => ({ language: String(row.language), n: Number(row.n ?? 0) })),
  };
}

export async function scriptDetail(slug: string): Promise<ScriptDetail> {
  const sql = await getSql();
  const rows = await sql.query<Record<string, unknown>>(
    `update scripts set views = views + 1
     where slug = $1
     returning id, slug, title, summary, handle, tags, license, stars, forks, views, updated_at, forked_from`,
    [slug],
  );
  const row = rows[0];
  if (!row) throw notFound();
  const id = String(row.id);
  const files = await sql.query<Record<string, unknown>>(
    `select filename, language, content from script_files where script_id = $1 order by position asc`,
    [id],
  );
  const revisions = await sql.query<Record<string, unknown>>(
    `select message, created_at from script_revisions
     where script_id = $1 order by created_at desc limit 12`,
    [id],
  );
  const card = mapCard({
    ...row,
    lead_file: files[0]?.filename,
    lead_lang: files[0]?.language,
    lead_preview: "",
    file_count: files.length,
  });
  return {
    ...card,
    forkedFrom: row.forked_from ? String(row.forked_from) : null,
    files: files.map((file) => ({
      filename: String(file.filename),
      language: String(file.language),
      content: String(file.content),
    })),
    revisions: revisions.map((rev) => ({
      message: String(rev.message),
      createdAt: stamp(rev.created_at),
    })),
  };
}

export async function createScript(draft: Draft): Promise<{ slug: string; editToken: string }> {
  const clean = cleanDraft(draft);
  const sql = await getSql();
  return insertBundle(sql, clean, null, clean.message);
}

export async function updateScript(input: {
  slug: string;
  editToken: string;
  draft: Draft;
}): Promise<{ ok: true }> {
  const clean = cleanDraft(input.draft);
  const token = input.editToken.trim();
  if (token.length < 8 || token.length > 80) throw new UserError("رمز التحرير غير صحيح");
  const sql = await getSql();
  const found = await sql.query<{ id: string }>(`select id from scripts where slug = $1`, [
    input.slug,
  ]);
  const id = found[0]?.id;
  if (!id) throw new UserError("السكربت غير موجود");
  const updated = await sql.query(
    `update scripts
     set title = $1, summary = $2, handle = $3, tags = $4, license = $5, updated_at = now()
     where id = $6 and edit_token = $7
     returning id`,
    [clean.title, clean.summary, clean.handle, clean.tags, clean.license, id, token],
  );
  if (!updated.length) throw new UserError("رمز التحرير غير صحيح");
  await sql.query(`delete from script_files where script_id = $1`, [id]);
  for (let index = 0; index < clean.files.length; index += 1) {
    const file = clean.files[index]!;
    await sql.query(
      `insert into script_files (id, script_id, filename, language, content, position)
       values ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), id, file.filename, file.language, file.content, index],
    );
  }
  await sql.query(`insert into script_revisions (id, script_id, message) values ($1,$2,$3)`, [
    randomUUID(),
    id,
    clean.message || "تحديث",
  ]);
  return { ok: true };
}

export async function removeScript(input: {
  slug: string;
  editToken: string;
}): Promise<{ ok: true }> {
  const token = input.editToken.trim();
  const sql = await getSql();
  const removed = await sql.query(
    `delete from scripts where slug = $1 and edit_token = $2 returning id`,
    [input.slug, token],
  );
  if (!removed.length) throw new UserError("تعذّر الحذف. تحقّق من رمز التحرير");
  return { ok: true };
}

export async function forkScript(input: {
  slug: string;
  handle: string;
}): Promise<{ slug: string; editToken: string }> {
  const sql = await getSql();
  const parent = await sql.query<{ id: string; title: string; summary: string; tags: string; license: string }>(
    `select id, title, summary, tags, license from scripts where slug = $1`,
    [input.slug],
  );
  const row = parent[0];
  if (!row) throw new UserError("السكربت غير موجود");
  const files = await sql.query<{ filename: string; language: string; content: string }>(
    `select filename, language, content from script_files where script_id = $1 order by position asc`,
    [row.id],
  );
  const draft = cleanDraft({
    title: row.title,
    summary: row.summary,
    handle: input.handle || "guest",
    tags: row.tags,
    license: row.license,
    message: "تفرّع",
    files: files.map((file) => ({
      filename: file.filename,
      language: file.language as CleanDraft["files"][number]["language"],
      content: file.content,
    })),
  });
  const created = await insertBundle(sql, draft, input.slug, "تفرّع");
  await sql.query(`update scripts set forks = forks + 1 where slug = $1`, [input.slug]);
  return created;
}

export async function setStar(input: {
  slug: string;
  voter: string;
  on: boolean;
}): Promise<{ stars: number }> {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(input.voter)) throw new UserError("معرّف التصويت غير صالح");
  const sql = await getSql();
  const found = await sql.query<{ id: string }>(`select id from scripts where slug = $1`, [
    input.slug,
  ]);
  const id = found[0]?.id;
  if (!id) throw new UserError("السكربت غير موجود");
  if (input.on) {
    const inserted = await sql.query(
      `insert into script_stars (script_id, voter_key) values ($1,$2)
       on conflict do nothing returning script_id`,
      [id, input.voter],
    );
    if (inserted.length) {
      await sql.query(`update scripts set stars = stars + 1 where id = $1`, [id]);
    }
  } else {
    const removed = await sql.query(
      `delete from script_stars where script_id = $1 and voter_key = $2 returning script_id`,
      [id, input.voter],
    );
    if (removed.length) {
      await sql.query(`update scripts set stars = greatest(stars - 1, 0) where id = $1`, [id]);
    }
  }
  const stars = await sql.query<{ stars: number }>(`select stars from scripts where id = $1`, [id]);
  return { stars: Number(stars[0]?.stars ?? 0) };
}

export async function readRaw(
  slug: string,
  filename?: string,
): Promise<{ filename: string; language: string; content: string; siblings: string[] } | null> {
  const sql = await getSql();
  const files = await sql.query<{ filename: string; language: string; content: string }>(
    `select f.filename, f.language, f.content
     from script_files f
     join scripts s on s.id = f.script_id
     where s.slug = $1
     order by f.position asc`,
    [slug],
  );
  if (!files.length) return null;
  const file = filename ? files.find((item) => item.filename === filename) : files[0];
  if (!file) return null;
  await sql.query(`update scripts set views = views + 1 where slug = $1`, [slug]);
  return {
    filename: file.filename,
    language: file.language,
    content: file.content,
    siblings: files.map((item) => item.filename),
  };
}
