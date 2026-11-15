/**
 * Correspondance entre les contrôles de Sentinel et les référentiels de conformité :
 * PCI-DSS v4.0, ISO/IEC 27001:2022 (annexe A) et SOC 2 (Trust Services Criteria).
 *
 * On ne cite QUE les identifiants d'exigences (numéros de chapitres) et un court
 * libellé rédigé par nos soins : le texte intégral de ces normes est protégé et
 * n'est pas reproduit. Ces repères aident à relier une faille à une exigence ;
 * ils ne valent pas constat de conformité, qui relève d'un auditeur qualifié.
 */

export type ControlRefs = { pci?: string[]; iso?: string[]; soc2?: string[] };

// Par identifiant de contrôle Sentinel. Les contrôles non listés retombent sur la
// correspondance par catégorie (CATEGORY_MAP) ci-dessous.
const MAP: Record<string, ControlRefs> = {
  https: { pci: ["4.2.1"], iso: ["A.8.24"], soc2: ["CC6.7"] },
  "http-redirect": { pci: ["4.2.1"], iso: ["A.8.24"], soc2: ["CC6.7"] },
  hsts: { pci: ["4.2.1"], iso: ["A.8.24"], soc2: ["CC6.7"] },
  "tls-cert": { pci: ["4.2.1"], iso: ["A.8.24"], soc2: ["CC6.7"] },
  "mixed-content": { pci: ["4.2.1", "6.4.3"], iso: ["A.8.24"], soc2: ["CC6.7"] },
  csp: { pci: ["6.2.4", "6.4.3"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  xfo: { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  xcto: { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  refpol: { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  permpol: { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  coop: { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  corp: { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  "cache-control": { pci: ["3.2.1"], iso: ["A.8.10"], soc2: ["CC6.1"] },
  cors: { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  "cors-reflection": { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  cookies: { pci: ["6.2.4", "8.3.1"], iso: ["A.8.24"], soc2: ["CC6.7"] },
  "cookies-samesite": { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  "server-leak": { pci: ["2.2.1", "6.3.1"], iso: ["A.8.9"], soc2: ["CC6.1"] },
  tech: { pci: ["6.3.3"], iso: ["A.8.8"], soc2: ["CC7.1"] },
  cve: { pci: ["6.3.1", "6.3.3", "11.3.1"], iso: ["A.8.8"], soc2: ["CC7.1"] },
  "exposed-backups": { pci: ["6.4.1", "9.4.1"], iso: ["A.8.9"], soc2: ["CC6.1"] },
  "sourcemap-exposure": { pci: ["6.3.1"], iso: ["A.8.9"], soc2: ["CC6.1"] },
  "api-spec": { pci: ["6.3.1"], iso: ["A.8.9"], soc2: ["CC6.1"] },
  "graphql-endpoint": { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  "exposed/.env": { pci: ["2.2.1", "8.3.1"], iso: ["A.8.9", "A.5.17"], soc2: ["CC6.1"] },
  "exposed/.git/config": { pci: ["6.4.1"], iso: ["A.8.9"], soc2: ["CC6.1"] },
  "exposed/server-status": { pci: ["2.2.1"], iso: ["A.8.9"], soc2: ["CC6.1"] },
  spf: { pci: ["5.4.1"], iso: ["A.8.23"], soc2: ["CC6.7"] },
  dmarc: { pci: ["5.4.1"], iso: ["A.8.23"], soc2: ["CC6.7"] },
  robots: { iso: ["A.8.9"], soc2: ["CC6.1"] },
  securitytxt: { iso: ["A.5.5"], soc2: ["CC2.3"] },
  "recon-subdomains": { pci: ["11.3.1"], iso: ["A.8.9"], soc2: ["CC7.1"] },
  "recon-admin": { pci: ["6.4.1"], iso: ["A.8.9"], soc2: ["CC6.1"] },
  "recon-form-csrf": { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  "recon-form-autocomplete": { pci: ["8.3.1"], iso: ["A.8.24"], soc2: ["CC6.1"] },
};

const CATEGORY_MAP: Record<string, ControlRefs> = {
  Transport: { pci: ["4.2.1"], iso: ["A.8.24"], soc2: ["CC6.7"] },
  TLS: { pci: ["4.2.1"], iso: ["A.8.24"], soc2: ["CC6.7"] },
  "En-têtes": { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  Cookies: { pci: ["6.2.4"], iso: ["A.8.24"], soc2: ["CC6.7"] },
  Exposition: { pci: ["6.4.1"], iso: ["A.8.9"], soc2: ["CC6.1"] },
  Divulgation: { pci: ["2.2.1"], iso: ["A.8.9"], soc2: ["CC6.1"] },
  CVE: { pci: ["6.3.3"], iso: ["A.8.8"], soc2: ["CC7.1"] },
  "E-mail": { pci: ["5.4.1"], iso: ["A.8.23"], soc2: ["CC6.7"] },
  Formulaires: { pci: ["6.2.4"], iso: ["A.8.26"], soc2: ["CC6.6"] },
  Reconnaissance: { pci: ["11.3.1"], iso: ["A.8.9"], soc2: ["CC7.1"] },
  "Bonnes pratiques": { iso: ["A.5.5"], soc2: ["CC2.3"] },
};

/** Le nom lisible de chaque référentiel, pour l'affichage. */
export const FRAMEWORK_LABELS: Record<keyof ControlRefs, string> = {
  pci: "PCI-DSS v4.0",
  iso: "ISO/IEC 27001:2022",
  soc2: "SOC 2 (TSC)",
};

/** Exigences rattachées à un contrôle (par id, sinon par catégorie, sinon vide). */
export function controlsFor(id: string, category?: string | null): ControlRefs {
  if (MAP[id]) return MAP[id];
  const normalized = id.startsWith("exposed/") ? id : undefined;
  if (normalized && MAP[normalized]) return MAP[normalized];
  if (category && CATEGORY_MAP[category]) return CATEGORY_MAP[category];
  return {};
}

/** Chaîne compacte « PCI 6.2.4 · ISO A.8.26 · SOC2 CC6.6 » pour un contrôle. */
export function controlsLabel(refs: ControlRefs): string {
  const parts: string[] = [];
  if (refs.pci?.length) parts.push(`PCI ${refs.pci.join(", ")}`);
  if (refs.iso?.length) parts.push(`ISO ${refs.iso.join(", ")}`);
  if (refs.soc2?.length) parts.push(`SOC2 ${refs.soc2.join(", ")}`);
  return parts.join(" · ");
}

export type ComplianceRow = { framework: keyof ControlRefs; control: string; failing: number };

/**
 * Synthèse de conformité : pour chaque exigence touchée par au moins un contrôle
 * en échec/alerte, le nombre de findings concernés. Trié par référentiel puis exigence.
 */
export function complianceSummary(
  findings: { id: string; category?: string | null; failing: boolean }[]
): ComplianceRow[] {
  const tally = new Map<string, ComplianceRow>();
  for (const f of findings) {
    if (!f.failing) continue;
    const refs = controlsFor(f.id, f.category);
    (Object.keys(FRAMEWORK_LABELS) as (keyof ControlRefs)[]).forEach((fw) => {
      for (const control of refs[fw] || []) {
        const key = `${fw}|${control}`;
        const row = tally.get(key) || { framework: fw, control, failing: 0 };
        row.failing += 1;
        tally.set(key, row);
      }
    });
  }
  const fwOrder: (keyof ControlRefs)[] = ["pci", "iso", "soc2"];
  return [...tally.values()].sort(
    (a, b) =>
      fwOrder.indexOf(a.framework) - fwOrder.indexOf(b.framework) ||
      a.control.localeCompare(b.control, undefined, { numeric: true })
  );
}
