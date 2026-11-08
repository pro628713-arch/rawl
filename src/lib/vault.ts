const TOKENS = "rawi-tokens";
const VOTER = "rawi-voter";
const HANDLE = "rawi-handle";
const STARS = "rawi-starred";
const JUST = "rawi-just";

function canUse(): boolean {
  return typeof window !== "undefined";
}

export function voterKey(): string {
  if (!canUse()) return "server";
  const existing = localStorage.getItem(VOTER);
  if (existing && /^[a-zA-Z0-9-]{8,80}$/.test(existing)) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(VOTER, next);
  return next;
}

export function readHandle(): string {
  if (!canUse()) return "";
  return localStorage.getItem(HANDLE) ?? "";
}

export function saveHandle(handle: string) {
  if (!canUse()) return;
  localStorage.setItem(HANDLE, handle);
}

function tokenMap(): Record<string, string> {
  if (!canUse()) return {};
  try {
    const raw = localStorage.getItem(TOKENS);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readToken(slug: string): string {
  return tokenMap()[slug] ?? "";
}

export function saveToken(slug: string, token: string) {
  if (!canUse()) return;
  const map = tokenMap();
  map[slug] = token;
  const entries = Object.entries(map).slice(-80);
  localStorage.setItem(TOKENS, JSON.stringify(Object.fromEntries(entries)));
}

export function dropToken(slug: string) {
  if (!canUse()) return;
  const map = tokenMap();
  delete map[slug];
  localStorage.setItem(TOKENS, JSON.stringify(map));
}

function starSet(): Set<string> {
  if (!canUse()) return new Set();
  try {
    const raw = localStorage.getItem(STARS);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function hasStar(slug: string): boolean {
  return starSet().has(slug);
}

export function writeStar(slug: string, on: boolean) {
  if (!canUse()) return;
  const set = starSet();
  if (on) set.add(slug);
  else set.delete(slug);
  localStorage.setItem(STARS, JSON.stringify([...set].slice(-200)));
}

export function markJustPublished(slug: string) {
  if (!canUse()) return;
  sessionStorage.setItem(JUST, slug);
}

export function takeJustPublished(slug: string): boolean {
  if (!canUse()) return false;
  if (sessionStorage.getItem(JUST) !== slug) return false;
  sessionStorage.removeItem(JUST);
  return true;
}
