import { createServerFn } from "@tanstack/react-start";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { LANG_IDS, UserError, type Draft } from "@/lib/script-model";
import {
  createScript,
  exploreBundle,
  forkScript,
  homeBundle,
  removeScript,
  scriptDetail,
  setStar,
  updateScript,
} from "@/lib/scripts.server";

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isNotFound(error) || isRedirect(error) || error instanceof UserError) throw error;
    console.error(error);
    throw new UserError("تعذّر إكمال العملية");
  }
}

const SLUG = /^[a-z0-9-]{1,80}$/;

function slugOf(data: { slug?: unknown }): string {
  if (!data || typeof data.slug !== "string" || !SLUG.test(data.slug)) {
    throw new UserError("رابط غير صالح");
  }
  return data.slug;
}

export const getHome = createServerFn({ method: "GET" }).handler(async () => {
  return run(() => homeBundle());
});

export const listScripts = createServerFn({ method: "GET" })
  .validator((data: { q?: string; lang?: string; sort?: string }) => {
    const q = typeof data?.q === "string" ? data.q.slice(0, 60) : "";
    const lang = typeof data?.lang === "string" && LANG_IDS.has(data.lang) ? data.lang : "";
    const sort = data?.sort === "stars" ? "stars" : "new";
    return { q, lang, sort } as const;
  })
  .handler(async ({ data }) => run(() => exploreBundle(data)));

export const getScript = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => ({ slug: slugOf(data) }))
  .handler(async ({ data }) => run(() => scriptDetail(data.slug)));

export const publishScript = createServerFn({ method: "POST" })
  .validator((data: Draft) => data)
  .handler(async ({ data }) => run(() => createScript(data)));

export const saveScript = createServerFn({ method: "POST" })
  .validator((data: { slug: string; editToken: string; draft: Draft }) => ({
    slug: slugOf(data),
    editToken: String(data.editToken ?? ""),
    draft: data.draft,
  }))
  .handler(async ({ data }) => run(() => updateScript(data)));

export const deleteScript = createServerFn({ method: "POST" })
  .validator((data: { slug: string; editToken: string }) => ({
    slug: slugOf(data),
    editToken: String(data.editToken ?? ""),
  }))
  .handler(async ({ data }) => run(() => removeScript(data)));

export const branchScript = createServerFn({ method: "POST" })
  .validator((data: { slug: string; handle: string }) => ({
    slug: slugOf(data),
    handle: typeof data.handle === "string" ? data.handle.slice(0, 24) : "",
  }))
  .handler(async ({ data }) => run(() => forkScript(data)));

export const toggleStar = createServerFn({ method: "POST" })
  .validator((data: { slug: string; voter: string; on: boolean }) => ({
    slug: slugOf(data),
    voter: String(data.voter ?? ""),
    on: Boolean(data.on),
  }))
  .handler(async ({ data }) => run(() => setStar(data)));
