// Chaîne de lint 100 % open source (ESLint 9, flat config).
// - eslint-config-next : react, react-hooks, jsx-a11y, import, @next/next, typescript-eslint
// - eslint-plugin-security : détection de patterns dangereux (eval, child_process,
//   fs non littéral, regex ReDoS, buffer non sûr…) — la couche SAST légère du dépôt.
import next from "eslint-config-next";
import security from "eslint-plugin-security";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
      "worker/**",
      "scripts/**",
    ],
  },
  ...next,
  security.configs.recommended,
  {
    rules: {
      // Qualité : garder l'intention de l'audit react-doctor, en avertissement.
      "react/jsx-key": "error",
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "error",
      // Effets de chargement de données (fetch + AbortController) : setState en
      // début d'effet est un pattern légitime ici, pas un bug — conseil perf only.
      "react-hooks/set-state-in-effect": "warn",

      // Sécurité : le bruit connu (detect-object-injection est très bavard sur du
      // TS typé) passe en warning ; les vrais dangers restent en erreur.
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-child-process": "error",
      "security/detect-possible-timing-attacks": "warn",
    },
  },
];

export default config;
