// Génère les QR codes (SVG) et la vCard pour la carte de contact numérique.
// Exécuter : node scripts/gen-qr.mjs
import QRCode from "qrcode";
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("public/qr", { recursive: true });

const SITE = "https://sentinel.kayzen-lyon.com";
const MAPS =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("KAYZEN LYON, 6 rue Pierre Termier, 69009 Lyon");
const AVIS = "https://www.google.com/search?q=" + encodeURIComponent("KAYZEN LYON avis");

const VCARD = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "N:LYON;KAYZEN;;;",
  "FN:KAYZEN LYON — Sentinel by Kayzen",
  "ORG:KAYZEN LYON",
  "TITLE:Cybersécurité offensive & pentest IA",
  "TEL;TYPE=WORK,VOICE:+33487776861",
  "EMAIL;TYPE=WORK:contact@kayzen-lyon.fr",
  "ADR;TYPE=WORK:;;6 rue Pierre Termier;Lyon;;69009;France",
  "URL:" + SITE,
  "END:VCARD",
].join("\r\n");

// vCard téléchargeable
writeFileSync("public/kayzen-lyon.vcf", VCARD + "\r\n", "utf8");

const opts = {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 1,
  color: { dark: "#1f3b61", light: "#ffffff" }, // navy sur blanc (charte)
};

const targets = {
  "public/qr/site.svg": SITE,
  "public/qr/vcard.svg": VCARD,
  "public/qr/maps.svg": MAPS,
  "public/qr/avis.svg": AVIS,
};

for (const [path, data] of Object.entries(targets)) {
  const svg = await QRCode.toString(data, opts);
  writeFileSync(path, svg, "utf8");
  console.log("écrit", path, "(" + svg.length + " o)");
}
console.log("vCard : public/kayzen-lyon.vcf");
