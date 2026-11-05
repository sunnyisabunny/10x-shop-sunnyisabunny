/**
 * NOTE: the lint rules behind `npm run lint`.
 * Why it exists: ESLint catches mistakes TypeScript does not, such as breaking the rules of hooks.
 * Why only two hook rules: the PRD names exactly these two. The plugin's larger "recommended" preset
 * also fails ordinary hook code, which would only add noise.
 * What breaks without it: `any` could slip in unnoticed, and the PRD says it must be impossible.
 */
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
