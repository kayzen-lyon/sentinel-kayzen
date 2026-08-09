import type { JobMode } from "./jobs";

/**
 * Playbooks prédéfinis : des instructions cadrées passées au moteur Strix (via `--instruction`)
 * pour orienter le pentest autonome vers un objectif précis. Inspiré des « playbooks » de
 * PentestAgent. Chaque playbook fixe aussi un mode de scan par défaut.
 */

export type Playbook = {
  id: string;
  name: string;
  description: string;
  mode: JobMode;
  instruction: string;
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: "web-owasp",
    name: "Application web — OWASP Top 10",
    description:
      "Couverture large des vulnérabilités web courantes : injections, XSS, contrôle d'accès, SSRF, désérialisation.",
    mode: "standard",
    instruction:
      "Réalise un test d'intrusion applicatif web complet aligné sur l'OWASP Top 10. " +
      "Priorise : injections (SQL/NoSQL/command/SSTI), XSS (stocké/réfléchi/DOM), " +
      "contrôle d'accès défaillant (IDOR, élévation de privilèges), SSRF, XXE et " +
      "désérialisation. Valide chaque vulnérabilité par un PoC réel et propose une remédiation.",
  },
  {
    id: "api-security",
    name: "API REST/GraphQL",
    description:
      "Focalisé sur les API : authentification, autorisation objet/fonction, mass assignment, rate limiting.",
    mode: "standard",
    instruction:
      "Concentre-toi sur la sécurité des API (REST/GraphQL). Teste l'authentification et la " +
      "gestion des jetons (JWT), l'autorisation au niveau objet et fonction (BOLA/BFLA, IDOR), " +
      "le mass assignment, l'exposition excessive de données, et les contournements de rate limiting.",
  },
  {
    id: "auth-focus",
    name: "Authentification & sessions",
    description:
      "Cible les mécanismes d'authentification : JWT, fixation de session, force brute, réinitialisation.",
    mode: "standard",
    instruction:
      "Audite en profondeur l'authentification et la gestion de session : attaques JWT, " +
      "fixation et prédictibilité de session, robustesse face au credential stuffing, " +
      "flux de réinitialisation de mot de passe, et politiques de verrouillage.",
  },
  {
    id: "bug-bounty",
    name: "Bug bounty (large surface)",
    description:
      "Reconnaissance étendue + recherche opportuniste de vulnérabilités à fort impact.",
    mode: "deep",
    instruction:
      "Adopte une approche bug bounty : cartographie large de la surface d'attaque, " +
      "recherche opportuniste de vulnérabilités à fort impact (RCE, SSRF, IDOR, prise de " +
      "contrôle de sous-domaine, secrets exposés) et chaînage d'attaques. Documente des PoC exploitables.",
  },
  {
    id: "business-logic",
    name: "Logique métier",
    description:
      "Failles de logique applicative : race conditions, manipulation de paiement, contournement de workflow.",
    mode: "deep",
    instruction:
      "Recherche les failles de logique métier : race conditions, manipulation de prix/paiement, " +
      "contournement d'étapes de workflow, abus de fonctionnalités, et incohérences d'état.",
  },
];

export function getPlaybook(id: string | undefined | null): Playbook | null {
  if (!id) return null;
  return PLAYBOOKS.find((p) => p.id === id) ?? null;
}
