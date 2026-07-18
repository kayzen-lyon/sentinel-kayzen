import { validateTargetUrl } from "../lib/ssrf";
import { runScan } from "../lib/scanner";

async function main() {
  const target = process.argv[2] || "https://nexus.kayzen-lyon.fr";
  console.log("Validation SSRF de :", target);
  const check = await validateTargetUrl(target);
  if (!check.ok) {
    console.error("REFUSÉ:", check.reason);
    process.exit(1);
  }
  console.log("OK, scan en cours…\n");
  const result = await runScan(check.url);
  console.log("Note:", result.grade, "| Score:", result.score + "/100");
  console.log("Résumé:", JSON.stringify(result.summary.counts));
  console.log("\nFindings:");
  for (const f of result.findings) {
    console.log(
      ` [${f.state.toUpperCase()}] ${f.severity.padEnd(8)} ${f.title}`
    );
  }
}

main().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});
