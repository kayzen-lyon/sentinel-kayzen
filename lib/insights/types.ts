/**
 * Données enrichies d'un scan (« insights ») : tout ce qui n'est pas un finding mais aide à
 * comprendre la cible — certificat, DNS, e-mail, hébergement, tiers, cookies, en-têtes bruts,
 * sous-scores. Module pur (types et petites aides) utilisable côté client et serveur.
 */

export type TlsVersion = "TLSv1" | "TLSv1.1" | "TLSv1.2" | "TLSv1.3";

export type TlsInsights = {
  protocols: Partial<Record<TlsVersion, boolean>>;
  cipher?: string;
  cipherWeak?: boolean;
  negotiated?: string;
  /** Protocole applicatif négocié (h2 = HTTP/2). */
  alpn?: string;
  cert?: {
    subject?: string;
    issuer?: string;
    validFrom?: string;
    validTo?: string;
    daysRemaining?: number;
    san: string[];
    hostnameCovered: boolean;
    keyType?: string;
    keyBits?: number;
    signatureAlgorithm?: string;
    serialNumber?: string;
    fingerprint256?: string;
    selfSigned?: boolean;
    authorized?: boolean;
    authError?: string;
  };
  hstsPreloadReady?: boolean;
};

export type DnsInsights = {
  a: string[];
  aaaa: string[];
  ns: string[];
  mx: { exchange: string; priority: number }[];
  caa: string[];
  txt: string[];
  dnssec?: boolean;
};

export type EmailInsights = {
  spf?: { record: string; all: "-all" | "~all" | "?all" | "+all" | "absent"; lookups: number };
  dmarc?: { record: string; policy: "none" | "quarantine" | "reject" | "absent"; rua: boolean };
  dkimSelectors: string[];
  mtaSts?: { record: boolean; policy: boolean; mode?: string };
  tlsRpt: boolean;
  score: number;
};

export type DomainInsights = {
  registrar?: string;
  expires?: string;
  daysToExpiry?: number;
  statuses: string[];
  transferLocked?: boolean;
};

export type HostingInsights = {
  ip?: string;
  asn?: string;
  org?: string;
  country?: string;
  reverse?: string;
};

export type RedirectHop = { url: string; status: number };

export type CookieInfo = {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  maxAge?: string;
  domain?: string;
  session: boolean;
};

export type ThirdParty = { host: string; kinds: string[]; sri: boolean; tracker?: string };
export type LibraryInfo = { name: string; version: string; vulnerable?: string };

export type CategoryKey = "transport" | "headers" | "dns" | "exposure" | "content" | "privacy";

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  transport: "Transport & TLS",
  headers: "En-têtes",
  dns: "DNS & e-mail",
  exposure: "Exposition",
  content: "Contenu & tiers",
  privacy: "Confidentialité",
};

export type ScanInsights = {
  durationMs?: number;
  checks?: number;
  summary?: string;
  categoryScores?: Partial<Record<CategoryKey, number>>;
  quickWins?: string[];
  tls?: TlsInsights;
  dns?: DnsInsights;
  email?: EmailInsights;
  domain?: DomainInsights;
  hosting?: HostingInsights;
  redirects?: RedirectHop[];
  http2?: boolean;
  http3?: boolean;
  compression?: string;
  headers?: [string, string][];
  cookies?: CookieInfo[];
  thirdParties?: ThirdParty[];
  libraries?: LibraryInfo[];
  emailsExposed?: number;
};
