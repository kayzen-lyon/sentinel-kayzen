/**
 * Lecture des cours du blog (format décrit dans content/cours/FORMAT.md).
 * Module pur : le texte est transformé en blocs typés, rendus ensuite par React sans aucun
 * HTML injecté (pas de dangerouslySetInnerHTML : aucun risque d'injection depuis le contenu).
 */

export type Track = "fondamentaux" | "entreprise" | "site-web" | "developpeurs";
export type Level = "debutant" | "intermediaire" | "avance";

export type CourseMeta = {
  slug: string;
  title: string;
  description: string;
  track: Track;
  level: Level;
  order: number;
  minutes: number;
  updated: string;
  tags: string[];
};

export type Inline =
  | { t: "text"; text: string }
  | { t: "b"; text: string }
  | { t: "code"; text: string }
  | { t: "a"; text: string; href: string };

export type CalloutKind = "astuce" | "attention" | "exemple" | "definition";

export type Block =
  | { t: "h2"; id: string; text: string }
  | { t: "h3"; id: string; text: string }
  | { t: "p"; inl: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "code"; lang: string; code: string }
  | { t: "callout"; kind: CalloutKind; inl: Inline[] };

export type QuizQuestion = { q: string; options: string[]; answer: number; explain: string };

export type Course = CourseMeta & {
  intro: Block[];
  objectives: Inline[][];
  body: Block[];
  takeaways: Inline[][];
  quiz: QuizQuestion[];
  words: number;
};

export const TRACKS: Record<Track, { label: string; level: Level; pitch: string }> = {
  fondamentaux: {
    label: "Les bons réflexes",
    level: "debutant",
    pitch: "Mots de passe, hameçonnage, sauvegardes, smartphone : se protéger au quotidien, sans jargon.",
  },
  entreprise: {
    label: "Protéger son entreprise",
    level: "intermediaire",
    pitch: "TPE, PME, associations : les mesures essentielles, la réglementation et la gestion d'incident.",
  },
  "site-web": {
    label: "Sécuriser son site web",
    level: "intermediaire",
    pitch: "HTTPS, en-têtes, CSP, WordPress, DNS : rendre un site robuste et le surveiller dans la durée.",
  },
  developpeurs: {
    label: "Développeurs et tests d'intrusion",
    level: "avance",
    pitch: "XSS, injections, contrôle d'accès, API, IA : comprendre les failles et écrire du code sûr.",
  },
};

export const LEVEL_LABEL: Record<Level, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Gras, code et liens d'une ligne de texte. */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*([^*\s][^*]*)\*/g;
  let last = 0;
  for (const m of src.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: "text", text: src.slice(last, i) });
    if (m[1] !== undefined) out.push({ t: "b", text: m[1] });
    else if (m[2] !== undefined) out.push({ t: "code", text: m[2] });
    else if (m[3] !== undefined) out.push({ t: "a", text: m[3], href: safeHref(m[4]) });
    else out.push({ t: "text", text: m[5] });
    last = i + m[0].length;
  }
  if (last < src.length) out.push({ t: "text", text: src.slice(last) });
  return out;
}

/** Seuls les liens internes (/…) et https:// sont conservés. */
function safeHref(h: string): string {
  return h.startsWith("/") || h.startsWith("https://") ? h : "#";
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) throw new Error("En-tête --- manquant");
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: raw.slice(m[0].length) };
}

/** Blocs d'un texte Markdown restreint. */
export function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { t: "ul" | "ol"; items: Inline[][] } | null = null;
  const flush = () => {
    if (para.length) blocks.push({ t: "p", inl: parseInline(para.join(" ")) });
    para = [];
    if (list) blocks.push(list);
    list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      while (++i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i]);
      blocks.push({ t: "code", lang: fence[1] || "text", code: code.join("\n") });
      continue;
    }
    const h = /^(#{2,3})\s+(.+)$/.exec(line);
    if (h) {
      flush();
      const text = h[2].trim();
      blocks.push({ t: h[1].length === 2 ? "h2" : "h3", id: slugify(text), text });
      continue;
    }
    const call = /^>\s*\[!(astuce|attention|exemple|definition)\]\s*(.*)$/i.exec(line);
    if (call) {
      flush();
      let text = call[2];
      while (i + 1 < lines.length && /^>\s?/.test(lines[i + 1])) text += " " + lines[++i].replace(/^>\s?/, "");
      blocks.push({ t: "callout", kind: call[1].toLowerCase() as CalloutKind, inl: parseInline(text.trim()) });
      continue;
    }
    const ul = /^\s*[-*]\s+(.+)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (ul || ol) {
      if (para.length) {
        blocks.push({ t: "p", inl: parseInline(para.join(" ")) });
        para = [];
      }
      const kind = ul ? "ul" : "ol";
      if (!list || list.t !== kind) {
        if (list) blocks.push(list);
        list = { t: kind, items: [] };
      }
      list.items.push(parseInline((ul || ol)![1].trim()));
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    if (list) {
      // Ligne de continuation d'un élément de liste
      const last = list.items[list.items.length - 1];
      last.push({ t: "text", text: " " }, ...parseInline(line.trim()));
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
}

/** Quiz : blocs « ?? question / - [ ] / - [x] / => explication ». */
export function parseQuiz(md: string): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  let cur: QuizQuestion | null = null;
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (line.startsWith("??")) {
      if (cur) out.push(cur);
      cur = { q: line.slice(2).trim(), options: [], answer: -1, explain: "" };
    } else if (cur && /^- \[( |x|X)\]/.test(line)) {
      if (/^- \[(x|X)\]/.test(line)) cur.answer = cur.options.length;
      cur.options.push(line.replace(/^- \[( |x|X)\]\s*/, ""));
    } else if (cur && line.startsWith("=>")) {
      cur.explain = line.slice(2).trim();
    }
  }
  if (cur) out.push(cur);
  return out.filter((q) => q.options.length >= 2 && q.answer >= 0);
}

const listItems = (blocks: Block[]) => blocks.flatMap((b) => (b.t === "ul" || b.t === "ol" ? b.items : []));

/** Découpe un fichier de cours complet. `slug` vient du nom de fichier. */
export function parseCourse(slug: string, raw: string): Course {
  const { meta, body } = parseFrontmatter(raw);
  const required = ["title", "description", "track", "level", "order", "minutes", "updated"];
  for (const k of required) if (!meta[k]) throw new Error(`${slug} : champ « ${k} » manquant`);
  if (!(meta.track in TRACKS)) throw new Error(`${slug} : parcours inconnu « ${meta.track} »`);
  if (!(meta.level in LEVEL_LABEL)) throw new Error(`${slug} : niveau inconnu « ${meta.level} »`);

  // Sections spéciales repérées par leur titre ##
  const parts = body.replace(/\r/g, "").split(/^(?=## )/m);
  const intro = parts[0].startsWith("## ") ? "" : parts.shift() ?? "";
  let objectives: Inline[][] = [];
  let takeaways: Inline[][] = [];
  let quiz: QuizQuestion[] = [];
  const rest: string[] = [];
  for (const part of parts) {
    const title = part.split("\n")[0].replace(/^##\s+/, "").trim().toLowerCase();
    const content = part.slice(part.indexOf("\n") + 1);
    if (title.startsWith("ce que vous allez apprendre")) objectives = listItems(parseBlocks(content));
    else if (title.startsWith("à retenir") || title.startsWith("a retenir")) takeaways = listItems(parseBlocks(content));
    else if (title === "quiz") quiz = parseQuiz(content);
    else rest.push(part);
  }
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title: meta.title,
    description: meta.description,
    track: meta.track as Track,
    level: meta.level as Level,
    order: Number(meta.order),
    minutes: Number(meta.minutes) || Math.max(1, Math.round(words / 200)),
    updated: meta.updated,
    tags: (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
    intro: parseBlocks(intro),
    objectives,
    body: parseBlocks(rest.join("\n")),
    takeaways,
    quiz,
    words,
  };
}

/** Texte brut d'une suite d'éléments en ligne (pour les extraits et le JSON-LD). */
export function plain(inl: Inline[]): string {
  return inl.map((x) => x.text).join("");
}
