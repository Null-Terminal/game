import { resolve } from "path";

import ts from "typescript";
import { defineConfig } from "vite";

import tsconfigPath from "vite-tsconfig-paths";
import { vitePluginTypescriptTransform } from "vite-plugin-typescript-transform";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, process.env.ENTRY),
      },
      output: {
        keepNames: true
      }
    }
  },

  plugins: [
    tsconfigPath(),

    vitePluginTypescriptTransform({
      enforce: "pre",

      filter: {
        files: {
          include: /\.ts$/,
        },
      },

      tsconfig: {
        override: {
          target: ts.ScriptTarget.ES2024,
        },
      },
    }),
  ]
});
