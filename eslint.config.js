import js from "@eslint/js";

import globals from "globals";
import tsEslint from "typescript-eslint";

import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["./dist"]),

  {
      files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
      plugins: { js },
      extends: ["js/recommended"],
      languageOptions: { globals: globals.node },
      rules: {
        "semi": ["error", "always"],
        "curly": ["error", "all"],
        "arrow-parens": ["error", "always"],
        "no-nested-ternary": "error",
        "multiline-ternary": ["error", "always-multiline"],
        "operator-linebreak": ["error", "after"],
        "padding-line-between-statements": ["error", {
          blankLine: "always",
          prev: ["multiline-const", "multiline-let", "multiline-var"],
          next: "*"
        }],
        "no-extra-semi": "error",
        "object-curly-spacing": ["warn", "always"],
        "no-multi-spaces": ["warn", {
          exceptions: {
            TSEnumMember: true,
            VariableDeclarator: true
          }
        }],
        "quotes": ["warn", "double", { avoidEscape: true }]
      }
  },

  tsEslint.configs.recommended.map((config) => ({
    ...config,
    rules: {
      ...config.rules,
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off"
    }
  })),

  {
    files: ["**/*.{ts,mts,cts}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "separate-type-imports"
      }],
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "no-restricted-syntax": ["error", {
        selector: ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression)[returnType.typeAnnotation.type="TSVoidKeyword"][body.type="BlockStatement"]',
        message: "Omit explicit void on implemented functions; TypeScript infers it"
      }]
    }
  }
]);
