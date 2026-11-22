// ESLint (flat config) for the whole repo: React rules for the client, Node globals for the server.
// Formatting is Prettier's job (.prettierrc.json); eslint-config-prettier turns off clashing rules.
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["**/dist/**", "**/node_modules/**", "prototype/**", "presentation/**", "tools/**", "livrables/**", "server/data/**"] },
  js.configs.recommended,
  {
    files: ["client/**/*.{js,jsx}"],
    ...react.configs.flat.recommended,
    languageOptions: { ...react.configs.flat.recommended.languageOptions, globals: globals.browser },
    settings: { react: { version: "detect" } },
  },
  react.configs.flat["jsx-runtime"],
  {
    files: ["client/**/*.{js,jsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/prop-types": "off", // small app without TypeScript: props are documented in JSDoc
      "react/no-unknown-property": ["error", { ignore: ["fetchpriority"] }], // React 18 has no fetchPriority prop
    },
  },
  { files: ["server/**/*.js", "*.config.js"], languageOptions: { globals: globals.node } },
  { rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }] } },
  prettier,
];
