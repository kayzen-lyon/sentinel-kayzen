import dns from "node:dns/promises";
import type { CaaRecord } from "node:dns";
import type { Finding } from "../scanner";
import { safeFetch } from "../ssrf";
import type { DnsInsights, DomainInsights, EmailInsights, HostingInsights } from "./types";

/**
 * DNS, sécurité e-mail, domaine et hébergement — informations publiques uniquement
 * (requêtes DNS, RDAP, DNS-over-HTTPS). Items 14 à 30 de docs/AMELIORATIONS-SCAN-DASHBOARD.md.
 */

const DKIM_SELECTORS = [
  "google", "selector1", "selector2", "default", "k1", "k2", "k3", "mail", "dkim", "s1", "s2",
  "mandrill", "mxvault", "smtp", "zoho", "protonmail", "fm1", "ovh", "ionos", "sendgrid",
];

const t = <T>(p: Promise<T>, fallback: T, ms = 5000): Promise<T> =>
  Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

const txt = async (name: string) => (await t(dns.resolveTxt(name), [] as string[][])).map((r) => r.join(""));

/** Mécanisme « all » d'un enregistrement SPF. */
export function spfAll(record: string): "-all" | "~all" | "?all" | "+all" | "absent" {
  const m = /(?:^|\s)([-~?+]?)all(?:\s|$)/i.exec(record);
  if (!m) return "absent";
  return (m[1] === "" ? "+all" : `${m[1]}all`) as "-all" | "~all" | "?all" | "+all";
}

/** Nombre de recherches DNS d'un SPF (récursif, borné). Limite RFC 7208 : 10. */
export async function spfLookups(record: string, depth = 0, resolver = txt): Promise<number> {
  if (depth > 4) return 0;
  let n = 0;
  for (const term of record.split(/\s+/)) {
    const inc = /^[+~?-]?include:(\S+)/i.exec(term) || /^redirect=(\S+)/i.exec(term);
    if (inc) {
      n++;
      const sub = (await resolver(inc[1])).find((r) => /^v=spf1/i.test(r));
      if (sub) n += await spfLookups(sub, depth + 1, resolver);
    } else if (/^[+~?-]?(a|mx|ptr|exists)(:|\/|$)/i.test(term)) n++;
  }
  return n;
}

/** Politique DMARC. */
export function dmarcPolicy(record: string): "none" | "quarantine" | "reject" | "absent" {
  const p = /(?:^|;)\s*p=(none|quarantine|reject)/i.exec(record)?.[1]?.toLowerCase();
  return (p as "none" | "quarantine" | "reject") || "absent";
}

/** Score de sécurité e-mail sur 100 (usurpation d'identité). */
export function emailScore(e: Omit<EmailInsights, "score">): number {
  let s = 100;
  const spf = e.spf?.all ?? "absent";
  s -= spf === "absent" ? 30 : spf === "+all" ? 30 : spf === "?all" ? 15 : spf === "~all" ? 5 : 0;
  if ((e.spf?.lookups ?? 0) > 10) s -= 10;
  const p = e.dmarc?.policy ?? "absent";
  s -= p === "absent" ? 30 : p === "none" ? 15 : p === "quarantine" ? 5 : 0;
  if (e.dmarc && !e.dmarc.rua) s -= 5;
  if (!e.dkimSelectors.length) s -= 5;
  if (!e.mtaSts?.record) s -= 3;
  if (!e.tlsRpt) s -= 2;
  return Math.max(0, s);
}

/** Interroge DNS-over-HTTPS (Cloudflare) pour lire le bit AD (DNSSEC validé). */
async function dnssecValidated(name: string): Promise<boolean | undefined> {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=A&do=1`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return undefined;
    const d = (await r.json()) as { AD?: boolean };
    return Boolean(d.AD);
  } catch {
    return undefined;
  }
}

const RDAP_UA = "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com)";
let ianaBootstrap: Promise<[string[], string[]][]> | null = null;

/** Serveur RDAP officiel du registre d'une extension (annuaire IANA, mis en cache par instance). */
async function rdapServer(tld: string): Promise<string | undefined> {
  ianaBootstrap ??= fetch("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(5000) })
    .then((r) => r.json())
    .then((d: { services: [string[], string[]][] }) => d.services)
    .catch(() => {
      ianaBootstrap = null;
      return [];
    });
  const services = await ianaBootstrap;
  return services.find(([tlds]) => tlds.includes(tld))?.[1]?.[0];
}

/** Expiration, registrar et statuts du domaine via RDAP (registre officiel, rdap.org en secours). */
async function rdap(apex: string): Promise<DomainInsights | undefined> {
  try {
    const server = await rdapServer(apex.split(".").pop() || "");
    const url = server
      ? `${server.replace(/\/?$/, "/")}domain/${encodeURIComponent(apex)}`
      : `https://rdap.org/domain/${encodeURIComponent(apex)}`;
    const r = await fetch(url, {
      headers: { accept: "application/rdap+json", "user-agent": RDAP_UA },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });
    if (!r.ok) return undefined;
    const d = (await r.json()) as {
      events?: { eventAction?: string; eventDate?: string }[];
      status?: string[];
      entities?: { roles?: string[]; vcardArray?: [string, [string, unknown, string, string][]] }[];
    };
    const expires = d.events?.find((e) => e.eventAction === "expiration")?.eventDate;
    const reg = d.entities?.find((e) => e.roles?.includes("registrar"));
    const fn = reg?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3];
    const statuses = d.status ?? [];
    return {
      registrar: typeof fn === "string" ? fn : undefined,
      expires,
      daysToExpiry: expires ? Math.round((new Date(expires).getTime() - Date.now()) / 86400000) : undefined,
      statuses,
      transferLocked: statuses.some((s) => /transfer ?prohibited/i.test(s)),
    };
  } catch {
    return undefined;
  }
}

/** Opérateur réseau (ASN) via le service DNS public de Team Cymru, et reverse DNS. */
async function hosting(ip: string | undefined): Promise<HostingInsights | undefined> {
  if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip ? { ip } : undefined;
  const rev = ip.split(".").reverse().join(".");
  const origin = (await txt(`${rev}.origin.asn.cymru.com`))[0];
  const asn = origin?.split("|")[0]?.trim();
  const country = origin?.split("|")[2]?.trim();
  const desc = asn ? (await txt(`AS${asn}.asn.cymru.com`))[0] : undefined;
  const org = desc?.split("|").pop()?.trim();
  const reverse = (await t(dns.reverse(ip), [] as string[]))[0];
  return { ip, asn: asn ? `AS${asn}` : undefined, org, country, reverse };
}

export async function analyzeDns(
  host: string,
  apex: string
): Promise<{ dns: DnsInsights; email: EmailInsights; domain?: DomainInsights; hosting?: HostingInsights; findings: Finding[] }> {
  const [a, aaaa, ns, mx, caa, apexTxt, dmarcTxt, mtaTxt, rptTxt, dnssec, domain, dkimHits] = await Promise.all([
    t(dns.resolve4(host), [] as string[]),
    t(dns.resolve6(host), [] as string[]),
    t(dns.resolveNs(apex), [] as string[]),
    t(dns.resolveMx(apex), [] as { exchange: string; priority: number }[]),
    t(dns.resolveCaa(apex), [] as CaaRecord[]),
    txt(apex),
    txt(`_dmarc.${apex}`),
    txt(`_mta-sts.${apex}`),
    txt(`_smtp._tls.${apex}`),
    dnssecValidated(apex),
    rdap(apex),
    Promise.all(DKIM_SELECTORS.map(async (s) => ((await txt(`${s}._domainkey.${apex}`)).some((r) => /p=/i.test(r)) ? s : null))),
  ]);

  const caaList = caa.map((c) => (c.issue ? `issue ${c.issue}` : c.issuewild ? `issuewild ${c.issuewild}` : c.iodef ? `iodef ${c.iodef}` : JSON.stringify(c)));
  const dnsInfo: DnsInsights = {
    a,
    aaaa,
    ns: ns.sort(),
    mx: mx.sort((x, y) => x.priority - y.priority),
    caa: caaList,
    txt: apexTxt.map((r) => (r.length > 180 ? `${r.slice(0, 180)}…` : r)).slice(0, 20),
    dnssec,
  };

  const spfRecord = apexTxt.find((r) => /^v=spf1/i.test(r));
  const dmarcRecord = dmarcTxt.find((r) => /^v=DMARC1/i.test(r));
  let mtaPolicy = false;
  let mtaMode: string | undefined;
  if (mtaTxt.some((r) => /^v=STSv1/i.test(r))) {
    const r = await safeFetch(`https://mta-sts.${apex}/.well-known/mta-sts.txt`, { timeoutMs: 5000 });
    const body = r && r.ok ? await r.text().catch(() => "") : "";
    mtaPolicy = /version:\s*STSv1/i.test(body);
    mtaMode = /mode:\s*(\w+)/i.exec(body)?.[1];
  }
  const base: Omit<EmailInsights, "score"> = {
    spf: spfRecord ? { record: spfRecord, all: spfAll(spfRecord), lookups: await spfLookups(spfRecord) } : undefined,
    dmarc: dmarcRecord ? { record: dmarcRecord, policy: dmarcPolicy(dmarcRecord), rua: /rua=/i.test(dmarcRecord) } : undefined,
    dkimSelectors: dkimHits.filter((s): s is string => !!s),
    mtaSts: { record: mtaTxt.some((r) => /^v=STSv1/i.test(r)), policy: mtaPolicy, mode: mtaMode },
    tlsRpt: rptTxt.some((r) => /^v=TLSRPTv1/i.test(r)),
  };
  const email: EmailInsights = { ...base, score: emailScore(base) };
  const host2 = await hosting(a[0]);

  const f: Finding[] = [];
  const add = (x: Finding) => f.push(x);

  // SPF
  const all = email.spf?.all ?? "absent";
  if (!email.spf)
    add({ id: "spf", category: "E-mail", title: "SPF absent", severity: "medium", state: "fail",
      detail: `Aucun enregistrement SPF sur ${apex} : n'importe qui peut envoyer des e-mails en votre nom.`,
      recommendation: mx.length ? "Publiez un TXT « v=spf1 include:<votre fournisseur> -all »." : "Domaine sans messagerie : publiez « v=spf1 -all » pour interdire tout envoi." });
  else if (all === "+all" || all === "?all" || all === "absent")
    add({ id: "spf", category: "E-mail", title: `SPF permissif (${all === "absent" ? "sans « all »" : all})`, severity: "high", state: "fail",
      detail: `L'enregistrement SPF n'interdit pas les expéditeurs inconnus : ${email.spf.record}`,
      recommendation: "Terminez l'enregistrement par « -all » (ou « ~all » pendant la transition)." });
  else
    add({ id: "spf", category: "E-mail", title: `SPF configuré (${all})`, severity: "info", state: all === "-all" ? "pass" : "warn",
      detail: email.spf.record, recommendation: all === "~all" ? "Passez à « -all » une fois tous les expéditeurs légitimes déclarés." : undefined });
  if (email.spf && email.spf.lookups > 10)
    add({ id: "spf-lookups", category: "E-mail", title: `SPF : ${email.spf.lookups} recherches DNS (limite 10)`, severity: "medium", state: "fail",
      detail: "Au-delà de 10 recherches, les serveurs de réception ignorent le SPF (permerror).",
      recommendation: "Réduisez les « include: » ou aplatissez le SPF (adresses IP directes)." });

  // DMARC
  const pol = email.dmarc?.policy ?? "absent";
  add(
    !email.dmarc
      ? { id: "dmarc", category: "E-mail", title: "DMARC absent", severity: "medium", state: "fail",
          detail: `Aucune politique DMARC sur ${apex} : l'usurpation de votre domaine n'est ni bloquée ni signalée.`,
          recommendation: "Publiez _dmarc." + apex + " TXT « v=DMARC1; p=quarantine; rua=mailto:dmarc@" + apex + " »." }
      : pol === "none"
        ? { id: "dmarc", category: "E-mail", title: "DMARC en mode observation (p=none)", severity: "low", state: "warn",
            detail: email.dmarc.record, recommendation: "Après analyse des rapports, passez à p=quarantine puis p=reject." }
        : { id: "dmarc", category: "E-mail", title: `DMARC appliqué (p=${pol})`, severity: "info", state: "pass", detail: email.dmarc.record }
  );
  if (email.dmarc && !email.dmarc.rua)
    add({ id: "dmarc-rua", category: "E-mail", title: "DMARC sans adresse de rapport", severity: "low", state: "warn",
      detail: "Sans « rua », vous ne voyez pas qui envoie des e-mails en votre nom.",
      recommendation: "Ajoutez rua=mailto:<adresse> à l'enregistrement DMARC." });

  // DKIM
  add(
    email.dkimSelectors.length
      ? { id: "dkim", category: "E-mail", title: "DKIM détecté", severity: "info", state: "pass",
          detail: `Sélecteur(s) trouvé(s) : ${email.dkimSelectors.join(", ")}.` }
      : { id: "dkim", category: "E-mail", title: "DKIM non trouvé (sélecteurs courants)", severity: "low", state: mx.length ? "warn" : "info",
          detail: `Aucune clé DKIM parmi ${DKIM_SELECTORS.length} sélecteurs usuels. Votre fournisseur peut en utiliser un autre.`,
          recommendation: "Activez la signature DKIM chez votre fournisseur de messagerie." }
  );
  if (mx.length && !email.mtaSts?.record)
    add({ id: "mta-sts", category: "E-mail", title: "MTA-STS absent", severity: "low", state: "warn",
      detail: "Sans MTA-STS, un attaquant réseau peut forcer la réception de vos e-mails en clair.",
      recommendation: "Publiez _mta-sts." + apex + " et la politique https://mta-sts." + apex + "/.well-known/mta-sts.txt." });

  // DNS
  add(
    caaList.some((c) => c.startsWith("issue"))
      ? { id: "caa", category: "DNS", title: "CAA configuré", severity: "info", state: "pass", detail: caaList.join(" · ") }
      : { id: "caa", category: "DNS", title: "Enregistrement CAA absent", severity: "low", state: "warn",
          detail: "N'importe quelle autorité de certification peut émettre un certificat pour votre domaine.",
          recommendation: `Publiez ${apex}. CAA 0 issue "letsencrypt.org" (adapté à votre autorité).` }
  );
  if (dnssec !== undefined)
    add(
      dnssec
        ? { id: "dnssec", category: "DNS", title: "DNSSEC activé et validé", severity: "info", state: "pass", detail: "Les réponses DNS de votre domaine sont signées." }
        : { id: "dnssec", category: "DNS", title: "DNSSEC non activé", severity: "low", state: "warn",
            detail: "Sans DNSSEC, des réponses DNS falsifiées peuvent rediriger vos visiteurs.",
            recommendation: "Activez DNSSEC chez votre registrar / hébergeur DNS (souvent un simple bouton)." }
    );
  if (ns.length === 1)
    add({ id: "ns-redundancy", category: "DNS", title: "Un seul serveur de noms", severity: "medium", state: "fail",
      detail: `Seul ${ns[0]} répond pour ${apex} : sa panne rend le domaine injoignable.`, recommendation: "Déclarez au moins deux serveurs de noms sur des réseaux distincts." });
  if (a.length && !aaaa.length)
    add({ id: "ipv6", category: "DNS", title: "Pas d'adresse IPv6", severity: "info", state: "info",
      detail: "Le site n'est pas joignable en IPv6 (enregistrement AAAA absent).", recommendation: "Activez IPv6 chez votre hébergeur ou CDN." });

  // Domaine
  if (domain?.daysToExpiry !== undefined && domain.daysToExpiry < 30)
    add({ id: "domain-expiry", category: "DNS", title: `Nom de domaine expirant dans ${domain.daysToExpiry} jour(s)`,
      severity: domain.daysToExpiry < 7 ? "critical" : "high", state: "fail",
      detail: `Le domaine ${apex} expire le ${domain.expires?.slice(0, 10)}. Expiré, il peut être racheté par un tiers.`,
      recommendation: "Renouvelez le domaine et activez le renouvellement automatique." });
  if (domain && domain.transferLocked === false)
    add({ id: "domain-lock", category: "DNS", title: "Domaine non verrouillé contre le transfert", severity: "low", state: "warn",
      detail: "Le statut clientTransferProhibited est absent : un transfert frauduleux est plus facile.",
      recommendation: "Activez le verrou de transfert chez votre registrar." });

  return { dns: dnsInfo, email, domain, hosting: host2, findings: f };
}
