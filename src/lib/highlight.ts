import type { Lang } from "@/lib/script-model";

export type TokenKind = "plain" | "kw" | "str" | "cmt" | "num";

export type Token = { t: TokenKind; v: string };

const KEYWORDS: Record<string, string[]> = {
  javascript: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while", "new",
    "class", "import", "export", "from", "async", "await", "try", "catch", "throw",
    "of", "in", "switch", "case", "break", "default", "typeof", "this", "true", "false", "null",
  ],
  typescript: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while", "new",
    "class", "import", "export", "from", "async", "await", "try", "catch", "throw",
    "type", "interface", "implements", "extends", "public", "private", "readonly", "as",
    "true", "false", "null", "undefined",
  ],
  python: [
    "def", "return", "if", "elif", "else", "for", "while", "import", "from", "class",
    "try", "except", "raise", "with", "as", "lambda", "yield", "True", "False", "None",
    "and", "or", "not", "in", "pass", "async", "await",
  ],
  lua: ["function", "end", "local", "if", "then", "else", "elseif", "for", "while", "do", "return", "true", "false", "nil", "and", "or", "not"],
  shell: ["if", "then", "else", "fi", "for", "in", "do", "done", "case", "esac", "echo", "exit", "return", "function"],
  go: ["func", "package", "import", "return", "if", "else", "for", "range", "var", "const", "type", "struct", "interface", "go", "defer", "nil", "true", "false"],
  rust: ["fn", "let", "mut", "pub", "use", "mod", "struct", "enum", "impl", "return", "if", "else", "for", "while", "loop", "match", "async", "await", "true", "false"],
  sql: ["select", "from", "where", "and", "or", "insert", "into", "values", "update", "set", "delete", "create", "table", "order", "by", "limit", "join", "left", "group", "as", "on"],
  css: [],
  html: [],
  json: [],
  markdown: [],
  text: [],
};

function commentStart(rest: string, lang: string): boolean {
  if (lang === "javascript" || lang === "typescript" || lang === "go" || lang === "rust") {
    return rest.startsWith("//");
  }
  if (lang === "python" || lang === "shell") return rest.startsWith("#");
  if (lang === "lua" || lang === "sql") return rest.startsWith("--");
  if (lang === "css") return rest.startsWith("/*");
  if (lang === "html") return rest.startsWith("<!--");
  return false;
}

export function tokenizeLine(line: string, lang: Lang | string): Token[] {
  const kw = new Set(KEYWORDS[lang] ?? []);
  const out: Token[] = [];
  const push = (t: TokenKind, v: string) => {
    if (!v) return;
    const last = out[out.length - 1];
    if (last && last.t === t) last.v += v;
    else out.push({ t, v });
  };
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    if (commentStart(rest, lang)) {
      push("cmt", rest);
      break;
    }
    const ch = line[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === "\\") {
          j += 2;
          continue;
        }
        if (line[j] === ch) {
          j += 1;
          break;
        }
        j += 1;
      }
      push("str", line.slice(i, j));
      i = j;
      continue;
    }
    if (ch === "#" && lang === "css" && /[0-9a-fA-F]/.test(line[i + 1] ?? "")) {
      let j = i + 1;
      while (j < line.length && /[0-9a-fA-F]/.test(line[j]!)) j += 1;
      push("num", line.slice(i, j));
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch) && (i === 0 || /[^A-Za-z0-9_]/.test(line[i - 1]!))) {
      let j = i + 1;
      while (j < line.length && /[0-9._a-fA-FxX]/.test(line[j]!)) j += 1;
      push("num", line.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j]!)) j += 1;
      const word = line.slice(i, j);
      push(kw.has(word) ? "kw" : "plain", word);
      i = j;
      continue;
    }
    push("plain", ch);
    i += 1;
  }
  return out;
}

const CLASS: Record<TokenKind, string> = {
  plain: "",
  kw: "tok-kw",
  str: "tok-str",
  cmt: "tok-cmt",
  num: "tok-num",
};

export function tokenClass(kind: TokenKind): string {
  return CLASS[kind];
}
