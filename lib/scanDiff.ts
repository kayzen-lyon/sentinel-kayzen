/**
 * Comparaison de deux scans du même site : ce qui est apparu, ce qui a été corrigé,
 * ce qui persiste. Fonction pure (utilisable côté serveur comme dans le navigateur).
 * Un contrôle « compte » quand il est en échec ou en alerte ; on rapproche par identifiant.
 */

export type DiffableFinding = { id: string; title: string; severity: string; state: string };

export type ScanDiff<T extends DiffableFinding> = {
  /** En échec/alerte maintenant, pas dans le scan de référence. */
  added: T[];
  /** En échec/alerte dans le scan de référence, plus maintenant. */
  fixed: T[];
  /** En échec/alerte dans les deux. */
  persisting: T[];
};

const failing = (f: DiffableFinding) => f.state === "fail" || f.state === "warn";

export function diffFindings<T extends DiffableFinding>(baseline: T[], current: T[]): ScanDiff<T> {
  const before = new Map(baseline.filter(failing).map((f) => [f.id, f]));
  const now = new Map(current.filter(failing).map((f) => [f.id, f]));
  return {
    added: [...now.values()].filter((f) => !before.has(f.id)),
    fixed: [...before.values()].filter((f) => !now.has(f.id)),
    persisting: [...now.values()].filter((f) => before.has(f.id)),
  };
}
