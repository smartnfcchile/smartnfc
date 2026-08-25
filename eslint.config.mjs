import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // La base heredada aún integra payloads dinámicos de Prisma y NextAuth.
    // La deuda de tipado permanece visible, pero no bloquea la validación.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["scripts/tests/**/*.ts"],
    rules: {
      // Estas pruebas reemplazan módulos deliberadamente para aislar Prisma.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
