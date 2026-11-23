/**
 * Questions fréquentes de l'accueil (rendues par components/Faq.tsx et publiées en données
 * structurées FAQPage). Chaque réponse s'ouvre sur une définition (tests/accueil.test.ts).
 */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "Qu'est-ce qu'un test d'intrusion (pentest) ?",
    a: "Un test d'intrusion, ou pentest, est une attaque simulée et autorisée contre une application, une API ou un domaine, pour trouver les failles exploitables avant un attaquant. Sentinel l'automatise avec des agents IA et documente chaque faille par une preuve d'exploitation (PoC).",
  },
  {
    q: "En quoi Sentinel diffère d'un scanner de vulnérabilités classique ?",
    a: "Un scanner de vulnérabilités est un outil qui signale des failles potentielles à partir de motifs connus, sans les exploiter. Le pentest autonome de Sentinel tente réellement l'exploitation et joint une preuve reproductible à chaque constat, ce qui réduit fortement les faux positifs et permet de prioriser ce qui est vraiment exploitable.",
  },
  {
    q: "Faut-il une autorisation pour tester un site ?",
    a: "Une autorisation écrite est l'accord signé du propriétaire d'un système qui fixe le périmètre et les dates d'un test. Sentinel l'exige avant tout test actif : document, hôtes autorisés et période sont enregistrés, et le serveur les vérifie avant chaque lancement, en plus de la preuve de propriété du domaine.",
  },
  {
    q: "Est-ce que mon code ou mon application est en sécurité pendant les tests ?",
    a: "Un environnement isolé (sandbox) est un espace d'exécution séparé de vos systèmes, où le moteur de test s'exécute. Les tests s'y déroulent dans le périmètre et les règles d'engagement définis avec vous en amont, et rien n'est mené hors de ce cadre.",
  },
  {
    q: "Sentinel remplace-t-il un pentester humain ?",
    a: "Un pentester est un expert qui mène des tests d'intrusion à la main. Sentinel automatise la reconnaissance, l'exploitation et la validation à une fréquence impossible manuellement ; sur les audits managés, les experts Kayzen interprètent les résultats et vous accompagnent sur la remédiation.",
  },
  {
    q: "Comment Sentinel limite-t-il les faux positifs ?",
    a: "Un faux positif est une alerte qui ne correspond à aucune faille réelle. Chaque constat du pentest autonome passe par trois filtres : une relecture contradictoire par un second modèle chargé de réfuter la preuve, un contrôle qui signale toute preuve citant un hôte hors de votre domaine vérifié, et une grille de triage en 7 questions que votre équipe renseigne avant de confirmer le constat.",
  },
  {
    q: "Que fait le scan approfondi sur mon JavaScript ?",
    a: "Le scan approfondi est l'analyse passive de votre page d'accueil et de ses fichiers JavaScript, sur un domaine dont vous avez prouvé la propriété (simples requêtes GET, rien n'est injecté). Il repère les secrets oubliés (clés cloud, jetons, clés privées), qu'il masque, et dresse une carte de surface : endpoints, formulaires et paramètres, avec les classes d'attaque à tester pour chacun.",
  },
  {
    q: "Que contient le rapport de test d'intrusion ?",
    a: "Le rapport de test d'intrusion est le document qui restitue les résultats d'un pentest. Celui de Sentinel contient une synthèse et le risque global, les vulnérabilités par gravité (CVSS) avec preuve et remédiation, un plan de remédiation par risque et effort, la méthode et les limites ; il s'exporte en PDF, Markdown, JSON et CSV, sans preuve d'exploitation dans les exports.",
  },
  {
    q: "Quels types de cibles puis-je tester ?",
    a: "Une cible est le système visé par un test : un dépôt de code (GitHub, GitLab…), une API, une application web déployée ou un domaine. Les tests peuvent être menés en white-box, grey-box ou black-box selon l'accès que vous fournissez.",
  },
  {
    q: "Comment fonctionne l'intégration CI/CD ?",
    a: "L'intégration continue (CI/CD) est la chaîne qui teste et déploie automatiquement votre code. Sentinel s'y branche pour lancer un test de sécurité à chaque pull request ; une faille peut bloquer une fusion avant qu'elle n'atteigne la production.",
  },
  {
    q: "Quel est le lien entre Sentinel, Kayzen, Nexus et Konforme ?",
    a: "Kayzen Web est l'agence lyonnaise qui porte le groupe Kayzen. Sentinel en est l'entité cybersécurité, aux côtés de Nexus (SEO et IA) et de Konforme (accessibilité EAA).",
  },
  {
    q: "Mes données restent-elles confidentielles ?",
    a: "Les résultats d'audit sont les constats, preuves et rapports produits pendant les tests. Ils vous appartiennent, ne sont accessibles qu'aux membres authentifiés de votre compte et ne sont jamais publiés par lien ; les preuves d'exploitation sont chiffrées au repos et les secrets découverts sont masqués. Un accord de confidentialité est signé avant toute prestation managée.",
  },
];
