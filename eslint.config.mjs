import { defineConfig, globalIgnores } from "eslint/config";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import query from "@tanstack/eslint-plugin-query";
import nextVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  js.configs.recommended,
  {
    files: ["**/*.{jsx,tsx}"],
    // Next.js registers this plugin. Reuse it to avoid duplicate registrations,
    // and let Next.js preserve its component-specific accessibility overrides.
    rules: jsxA11y.configs.recommended.rules,
    settings: {
      "jsx-a11y": {
        components: {
          Button: "button",
          Input: "input",
          Label: "label",
          Textarea: "textarea",
        },
      },
    },
  },
  ...nextVitals,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: fileURLToPath(new URL(".", import.meta.url)),
      },
    },
    rules: {
      // Concise callbacks and explicitly ignored, handled promises are intentional.
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        { ignoreArrowShorthand: true, ignoreVoidOperator: true },
      ],
      // Numeric interpolation is useful in UI text and generated documents.
      // Retain every other restriction from the strict preset.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [query.configs["flat/recommended"]],
  },
  {
    rules: {
      eqeqeq: ["error", "always"],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    "artifacts/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
