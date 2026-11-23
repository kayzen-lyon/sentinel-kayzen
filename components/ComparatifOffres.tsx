import { PLANS, type Limits, type PlanId } from "@/lib/plans";

/** Tableau comparatif des offres : quotas réels de la plateforme (lib/plans.ts), rien d'autre. */
const LIGNES: { cle: keyof Limits; libelle: string; format?: (n: number) => string }[] = [
  { cle: "passiveScans", libelle: "Scans passifs par mois" },
  { cle: "domains", libelle: "Domaines vérifiés" },
  { cle: "pentests", libelle: "Pentests autonomes par mois" },
  { cle: "schedules", libelle: "Surveillances planifiées actives" },
  { cle: "members", libelle: "Membres de l’équipe" },
  { cle: "aiBudgetUsd", libelle: "Budget IA des pentests par mois", format: (n) => `${n} $` },
];
const ORDRE: PlanId[] = ["free", "platform", "enterprise"];

function valeur(n: number | null, format?: (n: number) => string): string {
  if (n === null) return "Illimité";
  if (n === 0) return "Non inclus";
  return format ? format(n) : String(n);
}

export default function ComparatifOffres() {
  return (
    <div className="mx-auto mt-14 max-w-4xl overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="px-5 pt-5 text-left font-heading text-lg font-semibold text-fg">
          Comparatif des offres de la plateforme
          <span className="mt-1 block text-sm font-normal text-muted">
            Quotas mensuels appliqués par la plateforme. « Illimité » reste soumis aux limites anti-abus.
          </span>
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-5 py-3 font-semibold text-fg">Fonction</th>
            {ORDRE.map((p) => (
              <th key={p} scope="col" className="px-5 py-3 text-right font-semibold text-fg">
                {PLANS[p].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LIGNES.map((l) => (
            <tr key={l.cle} className="border-b border-border last:border-0">
              <th scope="row" className="px-5 py-3 font-normal text-muted">{l.libelle}</th>
              {ORDRE.map((p) => (
                <td key={p} className="px-5 py-3 text-right tabular-nums text-fg">
                  {valeur(PLANS[p].limits[l.cle], l.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
