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
  {
    id: "graphql",
    name: "API GraphQL",
    description:
      "Spécifique GraphQL : introspection, abus de batching/alias, autorisation objet/champ, déni de service par requête.",
    mode: "deep",
    instruction:
      "Réalise un test d'intrusion ciblé sur l'API GraphQL. Étapes : (1) tente l'introspection " +
      "(requête standard, requête allégée pour contourner un WAF, puis __schema minimal) et " +
      "cartographie le schéma ; (2) teste l'autorisation au niveau objet et champ (BOLA/BFLA) sur " +
      "les queries et mutations sensibles ; (3) évalue les abus de performance : alias overloading, " +
      "batching de requêtes, requêtes profondément imbriquées et directives coûteuses (déni de " +
      "service) ; (4) recherche l'injection via arguments et les fuites de données par messages " +
      "d'erreur verbeux. Valide chaque faille par un PoC réel et propose une remédiation (désactivation " +
      "de l'introspection en prod, limite de profondeur/complexité, contrôle d'accès au résolveur).",
  },
  {
    id: "supply-chain",
    name: "Chaîne d'approvisionnement logicielle",
    description:
      "Dépendances vulnérables, intégrité de build, secrets et sécurité CI/CD à partir du dépôt lié.",
    mode: "deep",
    instruction:
      "Audite la sécurité de la chaîne d'approvisionnement du dépôt lié. Étapes : (1) génère/consulte " +
      "un SBOM et repère les dépendances inconnues, abandonnées ou en conflit de licence ; (2) exécute " +
      "une analyse de composition (SCA) pour lister les composants vulnérables (CVE connues) et évalue " +
      "leur atteignabilité réelle dans le code ; (3) inspecte les workflows CI/CD (GitHub Actions) : " +
      "actions non épinglées, secrets exposés, permissions de jetons trop larges, injection via " +
      "pull_request_target ; (4) recherche les secrets commités (clés API, jetons, identifiants). " +
      "Priorise par exploitabilité, fournis des preuves et une remédiation (épinglage par SHA, " +
      "montée de version, rotation de secrets, durcissement des permissions).",
  },
  {
    id: "llm-security",
    name: "Application LLM / Agent IA",
    description:
      "OWASP LLM Top 10 : injection de prompt (directe/indirecte), abus d'outils, exposition RAG, fuite de prompt système.",
    mode: "deep",
    instruction:
      "Réalise une évaluation de sécurité d'une application LLM / agent IA alignée sur l'OWASP LLM " +
      "Top 10 et l'OWASP Agentic AI Top 10. Étapes : (1) cartographie la surface d'attaque IA — points " +
      "d'entrée (chat, upload, paramètres d'API, e-mails traités), outils enregistrés par l'agent et " +
      "flux de données jusqu'aux appels d'outils ; (2) teste l'injection de prompt directe (override " +
      "d'instructions, jailbreak, contournement par encodage/homoglyphes) puis indirecte (charge utile " +
      "dans un document/site récupéré par le RAG) ; (3) évalue l'abus d'outils et le franchissement de " +
      "l'humain-dans-la-boucle, l'empoisonnement de mémoire, et l'exfiltration via la sortie ; (4) " +
      "vérifie les fuites de prompt système et de données de contexte. Documente chaque vecteur par une " +
      "preuve reproductible et propose des garde-fous (séparation des canaux, validation de sortie, " +
      "moindre privilège des outils, approbation humaine).",
  },
  {
    id: "cloud-native",
    name: "Cloud / Conteneurs / Kubernetes",
    description:
      "SSRF de métadonnées (IMDS), IAM sur-permissif, buckets ouverts, RBAC K8s et chemins d'évasion de conteneur.",
    mode: "deep",
    instruction:
      "Réalise une évaluation cloud/conteneur/Kubernetes strictement dans le périmètre autorisé, sans " +
      "opération destructive ni scan réseau par défaut. Étapes : (1) identité et exposition — cartographie " +
      "l'identité courante (clés cloud, service account K8s) et les frontières de compte/namespace ; (2) " +
      "plan de contrôle cloud — buckets/stockage publics, ACL erronées, endpoint de métadonnées " +
      "(IMDSv1 vs v2, chaînes SSRF vers 169.254.169.254), rôles assumables (PassRole) et mouvement " +
      "latéral ; (3) conteneurs — conteneurs privileged, hostPath/hostNetwork, capabilities dangereuses " +
      "(SYS_ADMIN), chemins hôte inscriptibles (candidats à l'évasion), CVE d'image ; (4) Kubernetes — " +
      "RBAC excessif, Secrets exposés, contrôleurs d'admission, images de la chaîne d'appro. Valide " +
      "chaque exposition par une preuve non destructive et propose une remédiation (moindre privilège, " +
      "IMDSv2, durcissement des SecurityContext, RBAC restreint).",
  },
];

export function getPlaybook(id: string | undefined | null): Playbook | null {
  if (!id) return null;
  return PLAYBOOKS.find((p) => p.id === id) ?? null;
}
