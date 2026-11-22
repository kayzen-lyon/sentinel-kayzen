# 100 améliorations — scanner et dashboard (novembre 2026)

Objectif : des scans plus profonds et un dashboard riche en informations concrètes.
Contraintes respectées : 100 % gratuit, scans passifs (requêtes qu'un visiteur ordinaire
pourrait faire), contrôles intrusifs réservés aux domaines vérifiés (`deep`), CSP stricte.

Légende : **[S]** scan standard (toute URL) · **[A]** scan approfondi (domaine vérifié) ·
**[D]** dashboard · **[R]** rapports, suivi et alertes.

## 1. Transport & TLS
1. [S] Versions TLS acceptées (1.0, 1.1, 1.2, 1.3) par poignées de main dédiées.
2. [S] Signalement des protocoles obsolètes TLS 1.0 / 1.1.
3. [S] Suite de chiffrement négociée et détection des suites faibles (RC4, 3DES, CBC-SHA1, NULL, EXPORT).
4. [S] Détail du certificat : émetteur, sujet, dates, numéro de série, empreinte SHA-256.
5. [S] Couverture du nom d'hôte par les SAN du certificat.
6. [S] Taille et type de clé (RSA < 2048 bits signalé).
7. [S] Algorithme de signature (SHA-1 signalé).
8. [S] Certificat auto-signé ou chaîne incomplète.
9. [S] Alerte d'expiration graduée (30 / 14 / 7 jours).
10. [S] Éligibilité à la liste de préchargement HSTS (max-age ≥ 1 an, includeSubDomains, preload).
11. [S] Chaîne de redirections complète (sauts, codes, HTTPS à chaque étape).
12. [S] Cohérence www / apex (les deux répondent et convergent).
13. [S] Support HTTP/2 et annonce HTTP/3 (en-tête Alt-Svc).

## 2. DNS, domaine & hébergement
14. [S] Enregistrements CAA (autorités de certification autorisées).
15. [S] DNSSEC (bit AD via DNS-over-HTTPS).
16. [S] Serveurs de noms et redondance (≥ 2 serveurs).
17. [S] Enregistrements A / AAAA (IPv6 disponible).
18. [S] Date d'expiration du domaine (RDAP) avec alerte < 30 jours.
19. [S] Registrar et statuts de verrouillage du domaine (clientTransferProhibited).
20. [S] Hébergeur : adresse IP, ASN et opérateur (DNS Team Cymru).
21. [S] Reverse DNS de l'adresse IP.

## 3. Sécurité e-mail
22. [S] Analyse fine de SPF : `+all`, `?all`, `~all` vs `-all`.
23. [S] SPF : nombre de recherches DNS (limite de 10).
24. [S] DMARC : force de la politique (`none` / `quarantine` / `reject`).
25. [S] DMARC : présence d'adresses de rapport (`rua`).
26. [S] DKIM : recherche des sélecteurs courants (google, selector1/2, k1, default, mail…).
27. [S] Enregistrements MX et serveurs de messagerie.
28. [S] MTA-STS (enregistrement TXT + politique publiée).
29. [S] TLS-RPT (rapports de chiffrement SMTP).
30. [S] Score de sécurité e-mail dédié (usurpation d'identité).

## 4. En-têtes & navigateur
31. [S] Analyse détaillée de la CSP : `unsafe-inline`, `unsafe-eval`, jokers, `data:`.
32. [S] CSP : directives manquantes (`object-src`, `base-uri`, `frame-ancestors`, `form-action`).
33. [S] Cross-Origin-Embedder-Policy.
34. [S] X-Permitted-Cross-Domain-Policies.
35. [S] Rapports navigateur (Report-To / NEL / report-uri).
36. [S] Tableau détaillé des cookies : nom, Secure, HttpOnly, SameSite, durée, domaine.
37. [S] Cookies de session sans HttpOnly signalés spécifiquement.
38. [S] En-têtes de réponse bruts conservés et affichés.
39. [S] Compression (gzip / brotli) annoncée.
40. [A] Test CORS par réflexion d'une origine arbitraire (simple GET avec en-tête Origin).

## 5. Contenu & tiers
41. [S] Inventaire des domaines tiers chargés (scripts, styles, images, iframes).
42. [S] Scripts tiers sans Subresource Integrity (SRI).
43. [S] Bibliothèques JavaScript détectées avec version (jQuery, Bootstrap, Angular, Vue, React…).
44. [S] Bibliothèques obsolètes connues pour être vulnérables.
45. [S] Traceurs et outils marketing chargés d'office (contrôle RGPD indicatif).
46. [S] Formulaires qui envoient vers HTTP ou vers un domaine tiers.
47. [S] Adresses e-mail exposées en clair dans la page (collecte par robots).
48. [S] Commentaires HTML sensibles (TODO, mot de passe, clé, debug).
49. [S] Balises meta de générateur divulguant la version du CMS.
50. [S] Liens `target=_blank` sans `rel=noopener` (tabnabbing).

## 6. Exposition approfondie (domaine vérifié)
51. [A] Méthodes HTTP autorisées (OPTIONS) et TRACE activé.
52. [A] Page d'erreur 404 : fuite de pile d'appels, framework ou version.
53. [A] Listage de répertoires ouvert.
54. [A] WordPress : version, `xmlrpc.php` actif, énumération des utilisateurs via l'API REST.
55. [A] Fichiers sensibles supplémentaires (.DS_Store, .htaccess, web.config, composer.json, package.json, docker-compose.yml…).
56. [A] Pages de statut serveur (server-status, server-info, nginx_status).
57. [A] Consoles de debug (Laravel Telescope, Symfony profiler, Django debug, Werkzeug).
58. [A] Sous-domaines : résolution DNS et détection de prise de contrôle (CNAME vers service abandonné).
59. [A] robots.txt : chemins sensibles déclarés.
60. [A] Exécution parallèle des contrôles approfondis (tient dans la limite de 60 s).

## 7. Notation & recommandations
61. [S] Sous-scores par catégorie (Transport, En-têtes, DNS & e-mail, Exposition, Contenu, Confidentialité).
62. [S] Plafonnement de la note en cas de faille critique (pas de « A » avec un secret exposé).
63. [S] Estimation de l'effort de correction par finding (rapide / moyen / important).
64. [S] Liste des « gains rapides » (fort impact, faible effort).
65. [S] Extraits de configuration prêts à copier (nginx, Apache, Next.js/Vercel, Cloudflare) pour les en-têtes.
66. [S] Références OWASP / CWE par finding.
67. [S] Explication « pourquoi c'est important » pour chaque problème.
68. [S] Résumé exécutif généré automatiquement (3 phrases).
69. [S] Indice de priorité combinant gravité et effort.
70. [S] Durée du scan et nombre de contrôles exécutés affichés.

## 8. Page de résultat de scan
71. [D] Onglets : Synthèse, Problèmes, TLS & certificat, DNS & e-mail, Technologies & tiers, En-têtes, Surface.
72. [D] Barres de sous-scores par catégorie.
73. [D] Filtres par gravité et par catégorie, recherche plein texte.
74. [D] Carte « Certificat » (émetteur, expiration, SAN, clé, protocoles).
75. [D] Tableau DNS complet (A, AAAA, MX, NS, CAA, TXT).
76. [D] Tableau des cookies.
77. [D] Tableau des tiers et des bibliothèques.
78. [D] Affichage des en-têtes bruts.
79. [D] Export CSV et JSON du scan passif.
80. [D] Rapport imprimable / PDF du scan passif.

## 9. Vue d'ensemble du dashboard
81. [D] Sous-scores moyens par catégorie sur toutes les cibles.
82. [D] Inventaire des cibles : note, tendance, dernier scan, expiration du certificat.
83. [D] Calendrier d'expiration des certificats (jours restants par cible).
84. [D] Expiration des noms de domaine.
85. [D] Posture e-mail par domaine (SPF / DKIM / DMARC).
86. [D] Top 10 des problèmes ouverts, toutes cibles confondues.
87. [D] Gains rapides consolidés.
88. [D] Répartition des problèmes par catégorie.
89. [D] Exigences de conformité en échec (PCI / ISO / SOC 2) consolidées.
90. [D] Fil d'activité récent (journal d'audit).

## 10. Suivi, historique & alertes
91. [R] Filtre de l'historique des scans par cible.
92. [R] Comparaison de deux scans au choix.
93. [R] Courbe d'évolution par catégorie.
94. [R] Alerte surveillance : certificat qui expire bientôt.
95. [R] Alerte surveillance : nouveau problème critique ou élevé.
96. [R] Alerte surveillance : domaine qui expire bientôt.
97. [R] Taux de correction des vulnérabilités de pentest.
98. [R] Âge moyen des vulnérabilités ouvertes.
99. [R] API / MCP : accès aux nouvelles données du scan (insights).
100. [R] Conservation des données enrichies du scan (colonne `insights`) pour l'historique.

## État d'avancement (22 novembre 2026)

Livré : les 100 points ci-dessus (92 et 93 ajoutés le 22 novembre avec le blog), plus quatre
ajouts hors liste — enrichissement des CVE (exploitation active CISA KEV, probabilité EPSS),
énumération des sous-domaines sur trois sources publiques, commande « Vérifier vous-même » par
constat et rattachement au guide de test OWASP WSTG.

- 92 : sélecteur « Comparer avec le scan du… » sur la page Scanner (tous les scans de la cible).
- 93 : évolution de chaque sous-score moyen depuis le scan précédent, dans la vue d'ensemble.

Limites connues :
- 3 : seule la suite de chiffrement négociée est évaluée, pas la liste complète des suites acceptées.
- 45 : le contrôle des traceurs lit le HTML initial ; il ne remplace pas un test dans un navigateur.
- 26 : DKIM est cherché sur une vingtaine de sélecteurs courants ; un sélecteur personnalisé n'est pas vu.
- Les données enrichies n'existent que pour les scans lancés après cette version.
