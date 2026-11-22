import { TRIAGE_QUESTIONS } from "./triage";

/**
 * Questions fréquentes de l'accueil. Chaque réponse s'ouvre sur une définition ; les termes
 * clés sont entourés de `**…**` (rendus en <strong> par components/Faq.tsx, retirés par
 * `faqPlain` pour les données structurées FAQPage). Module pur : importé côté client.
 */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "Qu'est-ce qu'un test d'intrusion (pentest) ?",
    a: "Un **test d'intrusion**, ou **pentest**, est une attaque simulée et autorisée contre votre application pour vérifier quelles failles un attaquant pourrait réellement exploiter. Sentinel l'automatise avec des agents IA (moteur open source Strix) qui cartographient la surface d'attaque, tentent l'exploitation et joignent une **preuve de concept (PoC)** à chaque vulnérabilité remontée.",
  },
  {
    q: "En quoi Sentinel diffère d'un scanner de vulnérabilités classique ?",
    a: "Un **scanner de vulnérabilités** est un outil qui signale des failles potentielles à partir de signatures, sans chercher à les exploiter. Le pentest autonome de Sentinel tente au contraire d'exploiter chaque faille et la documente par un **PoC reproductible**, puis la soumet à une relecture contradictoire et à une grille de triage. Les correctifs se concentrent ainsi sur ce qui est réellement exploitable.",
  },
  {
    q: "Est-ce que mon code ou mon application est en sécurité pendant les tests ?",
    a: "Un **sandbox** est un environnement d'exécution isolé et éphémère. Les agents de Sentinel y travaillent, et le pentest offensif ne se lance que sur un domaine dont vous avez **prouvé la propriété**, après une **approbation humaine**. Pour un audit managé, le périmètre, les règles d'engagement et les exclusions sont définis avec vous en amont, et rien n'est mené hors de ce cadre.",
  },
  {
    q: "Sentinel remplace-t-il un pentester humain ?",
    a: "Un **pentester** est un expert en sécurité qui mène des tests d'intrusion à la main. Sentinel ne le remplace pas : il automatise la reconnaissance, l'exploitation et la validation à une fréquence impossible manuellement. Sur les **audits managés**, les experts Kayzen interprètent les résultats et vous accompagnent sur la remédiation.",
  },
  {
    q: "Comment Sentinel évite-t-il les faux positifs ?",
    a: `Un **faux positif** est une alerte qui signale une vulnérabilité inexistante ou non exploitable. Chaque vulnérabilité remontée par le pentest autonome passe par trois filtres : une **relecture contradictoire** par un second modèle chargé de réfuter la preuve, un audit automatique qui signale toute preuve citant un hôte hors de votre domaine vérifié, et une **grille de triage en ${TRIAGE_QUESTIONS.length} questions** que votre équipe renseigne avant de confirmer le finding. Le rapport inclut un registre de couverture des points d'entrée cartographiés.`,
  },
  {
    q: "Que fait le scan approfondi sur mon JavaScript ?",
    a: "Le **scan approfondi** est l'analyse réservée aux domaines dont vous avez prouvé la propriété. Sentinel y lit votre page d'accueil et ses bundles JavaScript (simples requêtes GET, rien n'est injecté). Il repère les **secrets oubliés** (clés cloud, jetons, clés privées), qu'il masque, et dresse une **carte de surface** : endpoints, formulaires et paramètres, avec les classes d'attaque à tester pour chacun.",
  },
  {
    q: "Quels types de cibles puis-je tester ?",
    a: "Une **cible** est l'actif que vous autorisez Sentinel à tester : un dépôt de code (GitHub, GitLab…), une API, une application web déployée ou un domaine. Les tests peuvent être menés en **white-box** (avec le code), **grey-box** (avec un accès partiel) ou **black-box** (sans accès) selon ce que vous fournissez.",
  },
  {
    q: "Comment fonctionne l'intégration CI/CD ?",
    a: "L'**intégration CI/CD** consiste à lancer un contrôle de sécurité automatiquement dans votre chaîne de livraison. La plateforme se branche sur votre pipeline et lance un test à chaque **pull request**. Les scans rapides se limitent aux fichiers modifiés, et une faille peut bloquer une fusion avant qu'elle n'atteigne la production.",
  },
  {
    q: "Qui conçoit Sentinel, et quel est le lien avec Kayzen, Nexus et Konforme ?",
    a: "Le **groupe Kayzen** réunit les applications portées par l'agence lyonnaise Kayzen Web. Sentinel en est l'entité cybersécurité, aux côtés de Nexus (SEO/IA) et Konforme (accessibilité EAA). Sentinel est conçu par **Tarek BELHADJ, Kayzen (EI)**.",
  },
  {
    q: "Mes données restent-elles confidentielles ?",
    a: "Un **accord de confidentialité** est un contrat qui interdit de divulguer les informations échangées. Les résultats d'audit vous appartiennent, sont stockés de façon sécurisée et ne sont jamais partagés. Un accord de confidentialité est signé avant toute prestation managée.",
  },
];

/** Réponse sans marqueurs `**`, pour les données structurées. */
export function faqPlain(a: string): string {
  return a.replace(/\*\*(.+?)\*\*/g, "$1");
}
