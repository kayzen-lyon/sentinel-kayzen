import tls from "node:tls";
import { resolveTxt } from "node:dns/promises";
import type { Finding } from "./scanner";
import { safeFetch } from "./ssrf";

const UA =
  "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com; passive security posture scan)";

type CertInfo = {
  issuer?: string;
  validTo?: string;
  daysRemaining?: number;
  authorized?: boolean;
  authError?: string;
  error?: string;
};

function getCertificate(host: string, port = 443): Promise<CertInfo> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: CertInfo) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    try {
      const socket = tls.connect(
        { host, port, servername: host, timeout: 8000, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          const authorized = socket.authorized;
          const authError = socket.authorizationError
            ? String(socket.authorizationError)
            : undefined;
          let daysRemaining: number | undefined;
          if (cert?.valid_to) {
            daysRemaining = Math.round(
              (new Date(cert.valid_to).getTime() - Date.now()) / 86400000
            );
          }
          const issuer =
            (cert?.issuer && (cert.issuer.O || cert.issuer.CN)) || undefined;
          finish({ issuer, validTo: cert?.valid_to, daysRemaining, authorized, authError });
          socket.end();
        }
      );
      socket.on("error", (e) => finish({ error: e.message }));
      socket.on("timeout", () => {
        socket.destroy();
        finish({ error: "timeout" });
      });
    } catch (e) {
      finish({ error: e instanceof Error ? e.message : "erreur TLS" });
    }
  });
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  // Suivi de redirections durci anti-SSRF (cf. lib/ssrf.ts).
  const r = await safeFetch(url, { headers: { "user-agent": UA }, timeoutMs });
  if (!r || !r.ok) return null;
  return r.text().catch(() => null);
}

/** Contrôles approfondis, réservés aux domaines dont la propriété est vérifiée. */
export async function deepChecks(target: URL): Promise<Finding[]> {
  const out: Finding[] = [];
  const host = target.hostname;
  const origin = target.origin;
  const isHttps = target.protocol === "https:";

  // --- Certificat TLS ---
  if (isHttps) {
    const cert = await getCertificate(host);
    if (cert.error) {
      out.push({
        id: "tls-cert",
        category: "TLS",
        title: "Certificat TLS non analysable",
        severity: "low",
        state: "warn",
        detail: `Impossible de lire le certificat (${cert.error}).`,
      });
    } else {
      const expiringSoon = (cert.daysRemaining ?? 999) < 21;
      const invalid = cert.authorized === false;
      out.push({
        id: "tls-cert",
        category: "TLS",
        title: invalid
          ? "Certificat TLS non valide"
          : expiringSoon
            ? "Certificat TLS expire bientôt"
            : "Certificat TLS valide",
        severity: invalid ? "high" : expiringSoon ? "medium" : "info",
        state: invalid ? "fail" : expiringSoon ? "warn" : "pass",
        detail: [
          cert.issuer && `Émis par ${cert.issuer}`,
          cert.validTo && `expire le ${cert.validTo}`,
          cert.daysRemaining !== undefined && `(${cert.daysRemaining} j restants)`,
          cert.authError && `Erreur: ${cert.authError}`,
        ]
          .filter(Boolean)
          .join(" · "),
        recommendation: expiringSoon
          ? "Renouvelez le certificat et automatisez son renouvellement (ACME/Let's Encrypt)."
          : invalid
            ? "Corrigez la chaîne de certification ou le nom d'hôte du certificat."
            : undefined,
      });
    }
  }

  // --- DNS : SPF / DMARC ---
  const apex = host.split(".").slice(-2).join(".");
  try {
    const txt = await resolveTxt(apex).catch(() => [] as string[][]);
    const flat = txt.map((r) => r.join(""));
    const spf = flat.find((r) => /^v=spf1/i.test(r));
    out.push(
      spf
        ? {
            id: "spf",
            category: "E-mail",
            title: "SPF configuré",
            severity: "info",
            state: "pass",
            detail: `Enregistrement SPF présent sur ${apex}.`,
          }
        : {
            id: "spf",
            category: "E-mail",
            title: "SPF absent",
            severity: "low",
            state: "warn",
            detail: `Aucun enregistrement SPF sur ${apex} (risque d'usurpation d'e-mail).`,
            recommendation: "Publiez un enregistrement TXT SPF (v=spf1 …).",
          }
    );
  } catch {
    /* ignore */
  }
  try {
    const dmarcTxt = await resolveTxt(`_dmarc.${apex}`).catch(() => [] as string[][]);
    const dmarc = dmarcTxt.map((r) => r.join("")).find((r) => /^v=DMARC1/i.test(r));
    out.push(
      dmarc
        ? {
            id: "dmarc",
            category: "E-mail",
            title: "DMARC configuré",
            severity: "info",
            state: "pass",
            detail: `Politique DMARC présente sur ${apex}.`,
          }
        : {
            id: "dmarc",
            category: "E-mail",
            title: "DMARC absent",
            severity: "medium",
            state: "warn",
            detail: `Aucune politique DMARC sur ${apex}.`,
            recommendation:
              "Publiez _dmarc.<domaine> TXT (v=DMARC1; p=quarantine|reject).",
          }
    );
  } catch {
    /* ignore */
  }

  // --- robots.txt / sitemap.xml ---
  const robots = await fetchText(`${origin}/robots.txt`, 6000);
  out.push(
    robots
      ? {
          id: "robots",
          category: "Bonnes pratiques",
          title: "robots.txt présent",
          severity: "info",
          state: "pass",
          detail: /sitemap:/i.test(robots)
            ? "robots.txt trouvé, avec référence au sitemap."
            : "robots.txt trouvé.",
        }
      : {
          id: "robots",
          category: "Bonnes pratiques",
          title: "robots.txt absent",
          severity: "low",
          state: "warn",
          detail: "Aucun fichier robots.txt.",
          recommendation: "Publiez un robots.txt et référencez-y votre sitemap.",
        }
  );

  // --- Contenu mixte (ressources http:// sur une page https) ---
  if (isHttps) {
    const html = await fetchText(origin, 9000);
    if (html) {
      const mixed = /(?:src|href)\s*=\s*["']http:\/\/[^"']+/gi.test(html);
      if (mixed) {
        out.push({
          id: "mixed-content",
          category: "Transport",
          title: "Contenu mixte détecté",
          severity: "medium",
          state: "fail",
          detail: "La page charge des ressources en http:// depuis une page https.",
          recommendation:
            "Servez toutes les ressources en HTTPS et ajoutez upgrade-insecure-requests à la CSP.",
        });
      }
    }
  }

  return out;
}
