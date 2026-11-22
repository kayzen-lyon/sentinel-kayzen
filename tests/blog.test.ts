import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseCourse, parseInline, parseQuiz, TRACKS, type Block, type Inline } from "../lib/courseParser";

/** Contrôle qualité de tous les cours du blog (content/cours/*.md). */

const DIR = path.join(process.cwd(), "content", "cours");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "FORMAT.md");
// eslint-disable-next-line security/detect-non-literal-fs-filename -- fichiers du dépôt
const courses = files.map((f) => parseCourse(f.replace(/\.md$/, ""), fs.readFileSync(path.join(DIR, f), "utf8")));
const slugs = new Set(courses.map((c) => c.slug));

function links(blocks: Block[]): string[] {
  const inl: Inline[] = blocks.flatMap((b) =>
    b.t === "p" || b.t === "callout" ? b.inl : b.t === "ul" || b.t === "ol" ? b.items.flat() : []
  );
  return inl.filter((x): x is Extract<Inline, { t: "a" }> => x.t === "a").map((x) => x.href);
}

test("blog : analyse du Markdown restreint", () => {
  assert.deepEqual(parseInline("un **gras** et `code` et [lien](/blog/x)"), [
    { t: "text", text: "un " },
    { t: "b", text: "gras" },
    { t: "text", text: " et " },
    { t: "code", text: "code" },
    { t: "text", text: " et " },
    { t: "a", text: "lien", href: "/blog/x" },
  ]);
  // Seuls les liens internes et https sont acceptés
  assert.equal((parseInline("[x](javascript:alert(1))")[0] as { href: string }).href, "#");
  const q = parseQuiz("?? Question ?\n- [ ] a\n- [x] b\n=> parce que\n\n?? Sans réponse\n- [ ] a\n- [ ] b");
  assert.equal(q.length, 1);
  assert.deepEqual(q[0], { q: "Question ?", options: ["a", "b"], answer: 1, explain: "parce que" });
});

test("blog : au moins un cours par parcours", () => {
  for (const t of Object.keys(TRACKS)) assert.ok(courses.some((c) => c.track === t), `parcours vide : ${t}`);
});

for (const c of courses) {
  test(`cours ${c.slug}`, () => {
    assert.ok(/^[a-z0-9-]+$/.test(c.slug) && !c.slug.startsWith("-") && !c.slug.endsWith("-") && !c.slug.includes("--"), "slug invalide");
    assert.ok(c.description.length >= 80 && c.description.length <= 200, `description de ${c.description.length} caractères`);
    assert.ok(c.intro.length > 0, "introduction manquante");
    assert.ok(c.objectives.length >= 3 && c.objectives.length <= 6, `${c.objectives.length} objectifs`);
    assert.ok(c.takeaways.length >= 3 && c.takeaways.length <= 7, `${c.takeaways.length} points à retenir`);
    assert.ok(c.quiz.length >= 3 && c.quiz.length <= 6, `${c.quiz.length} questions de quiz`);
    for (const q of c.quiz) assert.ok(q.explain, `explication manquante : ${q.q}`);
    assert.ok(c.body.filter((b) => b.t === "h2").length >= 3, "moins de 3 sections");
    assert.ok(c.body.some((b) => b.t === "callout" && b.kind === "exemple"), "aucun encadré [!exemple]");
    assert.ok(c.words >= 600 && c.words <= 2200, `${c.words} mots`);
    for (const href of links([...c.intro, ...c.body])) {
      if (href.startsWith("/blog/")) assert.ok(slugs.has(href.slice(6)), `lien interne mort : ${href}`);
      else assert.ok(href.startsWith("https://") || href.startsWith("/"), `lien refusé : ${href}`);
    }
  });
}

test("blog : ordres uniques dans chaque parcours", () => {
  for (const t of Object.keys(TRACKS)) {
    const orders = courses.filter((c) => c.track === t).map((c) => c.order);
    assert.equal(new Set(orders).size, orders.length, `ordre en double dans ${t}`);
  }
});
