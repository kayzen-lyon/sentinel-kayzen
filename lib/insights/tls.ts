import tls from "node:tls";
import { X509Certificate } from "node:crypto";
import type { Finding } from "../scanner";
import type { TlsInsights, TlsVersion } from "./types";

/**
 * Analyse TLS passive : quelques poignées de main, comme un navigateur ancien ou récent.
 * Aucune donnée applicative n'est envoyée. Items 1 à 10 de docs/AMELIORATIONS-SCAN-DASHBOARD.md.
 */

const VERSIONS: TlsVersion[] = ["TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"];

/** OID d'algorithmes de signature, encodés DER (recherchés dans le certificat brut). */
const SIG_OIDS: [string, string, boolean][] = [
  ["2a864886f70d010105", "SHA-1 avec RSA", true],
  ["2a8648ce3d0401", "ECDSA avec SHA-1", true],
  ["2a864886f70d010104", "MD5 avec RSA", true],
  ["2a864886f70d01010b", "SHA-256 avec RSA", false],
  ["2a864886f70d01010c", "SHA-384 avec RSA", false],
  ["2a864886f70d01010d", "SHA-512 avec RSA", false],
  ["2a864886f70d01010a", "RSA-PSS", false],
  ["2a8648ce3d040302", "ECDSA avec SHA-256", false],
  ["2a8648ce3d040303", "ECDSA avec SHA-384", false],
  ["2b6570", "Ed25519", false],
];

/** Suites de chiffrement faibles ou obsolètes. */
export function isWeakCipher(name: string): boolean {
  return /RC4|DES|NULL|EXPORT|MD5|anon/i.test(name);
}

/** Algorithme de signature déduit du certificat DER (premier OID connu rencontré). */
export function signatureAlgorithm(raw: Buffer): { name: string; weak: boolean } | null {
  const hex = raw.toString("hex");
  let best: { idx: number; name: string; weak: boolean } | null = null;
  for (const [oid, name, weak] of SIG_OIDS) {
    const idx = hex.indexOf(`06${(oid.length / 2).toString(16).padStart(2, "0")}${oid}`);
    if (idx >= 0 && (!best || idx < best.idx)) best = { idx, name, weak };
  }
  return best ? { name: best.name, weak: best.weak } : null;
}

type Handshake = {
  ok: boolean;
  protocol?: string;
  cipher?: string;
  alpn?: string;
  cert?: tls.DetailedPeerCertificate;
  authorized?: boolean;
  authError?: string;
};

function handshake(host: string, version?: TlsVersion, timeoutMs = 6000): Promise<Handshake> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: Handshake) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    try {
      const socket = tls.connect(
        {
          host,
          port: 443,
          servername: host,
          rejectUnauthorized: false,
          timeout: timeoutMs,
          ALPNProtocols: version ? undefined : ["h2", "http/1.1"],
          // Autorise les protocoles anciens côté client pour SAVOIR si le serveur les accepte.
          ...(version ? { minVersion: version, maxVersion: version, ciphers: "DEFAULT@SECLEVEL=0" } : {}),
        },
        () => {
          const cipher = socket.getCipher();
          finish({
            ok: true,
            protocol: socket.getProtocol() || undefined,
            cipher: cipher?.standardName || cipher?.name,
            alpn: socket.alpnProtocol || undefined,
            cert: version ? undefined : socket.getPeerCertificate(true),
            authorized: socket.authorized,
            authError: socket.authorizationError ? String(socket.authorizationError) : undefined,
          });
          socket.end();
        }
      );
      socket.on("error", () => finish({ ok: false }));
      socket.on("timeout", () => {
        socket.destroy();
        finish({ ok: false });
      });
    } catch {
      finish({ ok: false });
    }
  });
}

/** Analyse TLS complète d'un hôte (HTTPS uniquement). */
export async function analyzeTls(
  host: string,
  hstsHeader: string
): Promise<{ insights: TlsInsights; findings: Finding[] }> {
  const [main, ...probes] = await Promise.all([handshake(host), ...VERSIONS.map((v) => handshake(host, v))]);
  const protocols: Partial<Record<TlsVersion, boolean>> = {};
  VERSIONS.forEach((v, i) => (protocols[v] = probes[i].ok));

  const insights: TlsInsights = {
    protocols,
    cipher: main.cipher,
    cipherWeak: main.cipher ? isWeakCipher(main.cipher) : undefined,
    negotiated: main.protocol,
    alpn: main.alpn,
  };
  const findings: Finding[] = [];

  // HSTS : éligibilité à la liste de préchargement des navigateurs
  const maxAge = Number(/max-age=(\d+)/i.exec(hstsHeader)?.[1] || 0);
  insights.hstsPreloadReady =
    maxAge >= 31536000 && /includesubdomains/i.test(hstsHeader) && /preload/i.test(hstsHeader);

  const c = main.cert;
  if (main.ok && c && c.raw) {
    let keyType: string | undefined;
    let keyBits: number | undefined;
    try {
      const x = new X509Certificate(c.raw);
      keyType = x.publicKey.asymmetricKeyType;
      const det = x.publicKey.asymmetricKeyDetails;
      keyBits = det?.modulusLength ?? (det?.namedCurve ? Number(/\d+/.exec(det.namedCurve)?.[0]) || undefined : undefined);
    } catch {
      /* certificat illisible */
    }
    const san = (c.subjectaltname || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.startsWith("DNS:"))
      .map((s) => s.slice(4));
    const covered = tls.checkServerIdentity(host, c) === undefined;
    const sig = signatureAlgorithm(c.raw);
    const days = c.valid_to ? Math.round((new Date(c.valid_to).getTime() - Date.now()) / 86400000) : undefined;
    const str = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : undefined);
    const selfSigned =
      !!c.issuer && !!c.subject && JSON.stringify(c.issuer) === JSON.stringify(c.subject);
    insights.cert = {
      subject: str(c.subject?.CN),
      issuer: str(c.issuer?.O) || str(c.issuer?.CN),
      validFrom: c.valid_from,
      validTo: c.valid_to,
      daysRemaining: days,
      san: san.slice(0, 50),
      hostnameCovered: covered,
      keyType,
      keyBits,
      signatureAlgorithm: sig?.name,
      serialNumber: c.serialNumber,
      fingerprint256: c.fingerprint256,
      selfSigned,
      authorized: main.authorized,
      authError: main.authError,
    };

    if (covered && !selfSigned && main.authorized && (days ?? 99) >= 30)
      findings.push({
        id: "tls-cert",
        category: "TLS",
        title: "Certificat TLS valide",
        severity: "info",
        state: "pass",
        detail: `Émis par ${insights.cert.issuer ?? "?"}, expire le ${c.valid_to} (${days} j restants).`,
      });
    else if (!main.authorized && main.authError && covered && !selfSigned)
      findings.push({
        id: "tls-cert",
        category: "TLS",
        title: "Chaîne de certificat non validée",
        severity: "high",
        state: "fail",
        detail: `Le certificat n'est pas reconnu par les autorités de confiance (${main.authError}).`,
        recommendation: "Servez la chaîne complète (certificat + intermédiaires) et vérifiez l'autorité émettrice.",
      });
    if (!covered)
      findings.push({
        id: "tls-hostname",
        category: "TLS",
        title: "Le certificat ne couvre pas ce nom d'hôte",
        severity: "high",
        state: "fail",
        detail: `${host} n'apparaît pas dans les noms du certificat (${san.slice(0, 6).join(", ") || "aucun SAN"}).`,
        recommendation: "Émettez un certificat dont les SAN incluent ce nom d'hôte (ou un joker adapté).",
      });
    if (selfSigned)
      findings.push({
        id: "tls-selfsigned",
        category: "TLS",
        title: "Certificat auto-signé",
        severity: "high",
        state: "fail",
        detail: "Le certificat est signé par lui-même : les navigateurs affichent une alerte de sécurité.",
        recommendation: "Utilisez un certificat délivré par une autorité reconnue (Let's Encrypt est gratuit).",
      });
    if (keyType === "rsa" && keyBits && keyBits < 2048)
      findings.push({
        id: "tls-weak-key",
        category: "TLS",
        title: `Clé RSA trop courte (${keyBits} bits)`,
        severity: "high",
        state: "fail",
        detail: "Une clé RSA de moins de 2048 bits est considérée comme cassable.",
        recommendation: "Régénérez la clé en RSA 2048 bits minimum (3072 recommandé) ou en ECDSA P-256.",
      });
    if (sig?.weak)
      findings.push({
        id: "tls-weak-signature",
        category: "TLS",
        title: `Signature de certificat obsolète (${sig.name})`,
        severity: "high",
        state: "fail",
        detail: "SHA-1 et MD5 permettent de forger des certificats : les navigateurs les rejettent.",
        recommendation: "Réémettez le certificat avec une signature SHA-256 ou plus.",
      });
    if (days !== undefined && days >= 0 && days < 30)
      findings.push({
        id: "tls-expiry",
        category: "TLS",
        title: `Certificat expirant dans ${days} jour(s)`,
        severity: days < 7 ? "high" : days < 14 ? "medium" : "low",
        state: days < 14 ? "fail" : "warn",
        detail: `Le certificat expire le ${c.valid_to}.`,
        recommendation: "Renouvelez le certificat et automatisez le renouvellement (ACME).",
      });
  }

  const legacy = (["TLSv1", "TLSv1.1"] as TlsVersion[]).filter((v) => protocols[v]);
  findings.push(
    legacy.length
      ? {
          id: "tls-legacy",
          category: "TLS",
          title: `Protocoles obsolètes acceptés (${legacy.join(", ").replace(/TLSv1(?!\.)/, "TLS 1.0")})`,
          severity: "medium",
          state: "fail",
          detail: "TLS 1.0 et 1.1 sont retirés par l'IETF (RFC 8996) et refusés par les navigateurs.",
          recommendation: "Désactivez TLS 1.0 et 1.1 ; n'acceptez que TLS 1.2 et 1.3.",
        }
      : {
          id: "tls-legacy",
          category: "TLS",
          title: "Aucun protocole TLS obsolète accepté",
          severity: "info",
          state: "pass",
          detail: "TLS 1.0 et 1.1 sont refusés.",
        }
  );
  if (protocols["TLSv1.3"] === false && main.ok)
    findings.push({
      id: "tls13",
      category: "TLS",
      title: "TLS 1.3 non pris en charge",
      severity: "low",
      state: "warn",
      detail: "TLS 1.3 est plus rapide et plus sûr que TLS 1.2.",
      recommendation: "Activez TLS 1.3 sur le serveur ou le CDN.",
    });
  if (insights.cipherWeak)
    findings.push({
      id: "tls-cipher",
      category: "TLS",
      title: `Suite de chiffrement faible négociée (${insights.cipher})`,
      severity: "high",
      state: "fail",
      detail: "La suite choisie par le serveur est considérée comme cassable.",
      recommendation: "Restreignez les suites aux AEAD modernes (AES-GCM, ChaCha20-Poly1305).",
    });
  if (/preload/i.test(hstsHeader) && !insights.hstsPreloadReady)
    findings.push({
      id: "hsts-preload",
      category: "Transport",
      title: "Directive HSTS « preload » incomplète",
      severity: "low",
      state: "warn",
      detail: "Le préchargement exige max-age ≥ 31536000 et includeSubDomains.",
      recommendation: "Utilisez : Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
    });

  return { insights, findings };
}
