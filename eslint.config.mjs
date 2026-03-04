import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // OSS code cannot import from premium modules
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: ["src/premium/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["**/premium/**"],
          message: "OSS code cannot import from premium modules."
        }]
      }]
    }
  },
  // Premium code is exempt from the restriction
  {
    files: ["src/premium/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": "off"
    }
  },
]);

export default eslintConfig;
