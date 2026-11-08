export function mimeFor(language: string): string {
  if (language === "javascript") return "text/javascript; charset=utf-8";
  if (language === "css") return "text/css; charset=utf-8";
  if (language === "json") return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

export function rawHeaders(mime: string, siblings: string[]): HeadersInit {
  return {
    "content-type": mime,
    "x-content-type-options": "nosniff",
    "access-control-allow-origin": "*",
    "cache-control": "public, max-age=30",
    "x-rawi-files": encodeURIComponent(siblings.join(",")),
  };
}
