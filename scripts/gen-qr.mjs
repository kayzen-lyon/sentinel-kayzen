// Génère les QR codes (SVG) et la vCard de la carte de contact numérique.
// Exécuter : node scripts/gen-qr.mjs
// Cibles et coordonnées alignées sur lib/company.ts (et sur kayzen-lyon.com).
import QRCode from "qrcode";
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("public/qr", { recursive: true });

const SITE = "https://sentinel.kayzen-lyon.com";
// Fiche d'établissement Google (CID stable) : itinéraire et avis.
const MAPS = "https://maps.google.com/?cid=13733496944041442777";
const AVIS = MAPS;

const VCARD = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:KAYZEN — Sentinel",
  "N:KAYZEN;;;;",
  "ORG:KAYZEN",
  "TITLE:Sentinel by Kayzen — pentest IA autonome & cybersécurité offensive",
  "TEL;TYPE=WORK,VOICE:+33487776861",
  "EMAIL;TYPE=WORK:contact@kayzen-lyon.fr",
  "URL:" + SITE,
  "ADR;TYPE=WORK:;;6 Rue de Bourgogne;Lyon;;69009;France",
  "GEO:45.7758039;4.8051837",
  "NOTE:Sentinel by Kayzen — pentest IA autonome\\, audit de sécurité et plateforme self-service. Lun–Ven 9h–19h.",
  "END:VCARD",
].join("\r\n");

writeFileSync("public/kayzen-lyon.vcf", VCARD + "\r\n", "utf8");

// Noir sur blanc : le cadre du QR reste blanc quel que soit le thème (lisibilité au scan).
const opts = {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 2,
  width: 256,
  color: { dark: "#111827", light: "#ffffff" },
};

const targets = {
  "public/qr/site.svg": SITE,
  "public/qr/maps.svg": MAPS,
  "public/qr/avis.svg": AVIS,
  "public/qr/vcard.svg": VCARD,
};

for (const [path, data] of Object.entries(targets)) {
  const svg = await QRCode.toString(data, opts);
  writeFileSync(path, svg, "utf8");
  console.log("écrit", path, "(" + svg.length + " o)");
}
console.log("vCard : public/kayzen-lyon.vcf");
