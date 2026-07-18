export const FAQ: { q: string; a: string }[] = [
  {
    q: "En quoi Sentinel diffère d'un scanner de vulnérabilités classique ?",
    a: "Un scanner signale des vulnérabilités potentielles à partir de motifs. Sentinel exploite réellement chaque faille et la prouve par un PoC reproductible. Résultat : pas de faux positifs, et des correctifs priorisés sur ce qui est vraiment exploitable.",
  },
  {
    q: "Est-ce que mon code ou mon application est en sécurité pendant les tests ?",
    a: "Oui. Les tests s'exécutent dans un environnement sandbox isolé. Le périmètre, les règles d'engagement et les exclusions sont définis avec vous en amont, et rien n'est mené hors de ce cadre.",
  },
  {
    q: "Sentinel remplace-t-il un pentester humain ?",
    a: "Il démultiplie vos capacités. Sentinel automatise la reconnaissance, l'exploitation et la validation à une échelle et une fréquence impossibles manuellement. Sur les audits managés, nos experts Kayzen interprètent les résultats et vous accompagnent sur la remédiation.",
  },
  {
    q: "Quels types de cibles puis-je tester ?",
    a: "Un dépôt de code (GitHub, GitLab…), une API, une application web déployée ou un domaine. Les tests peuvent être menés en white-box, grey-box ou black-box selon l'accès que vous fournissez.",
  },
  {
    q: "Comment fonctionne l'intégration CI/CD ?",
    a: "La plateforme se branche sur votre pipeline et lance un test de sécurité à chaque pull request. Les scans rapides se limitent automatiquement aux fichiers modifiés, et une faille peut bloquer une fusion avant qu'elle n'atteigne la production.",
  },
  {
    q: "Quel est le lien entre Sentinel, Kayzen, Nexus et Konforme ?",
    a: "Sentinel est la nouvelle entité cybersécurité du groupe Kayzen, aux côtés de Nexus (SEO/IA) et Konforme (accessibilité EAA), toutes portées par l'agence lyonnaise Kayzen Web.",
  },
  {
    q: "Mes données restent-elles confidentielles ?",
    a: "Oui. Les résultats d'audit vous appartiennent, sont stockés de façon sécurisée et ne sont jamais partagés. Un accord de confidentialité est signé avant toute prestation managée.",
  },
];
