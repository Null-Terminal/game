import { configDefaults, defineConfig } from "vitest/config";
import ts from "typescript";
import tsconfigPaths from "vite-tsconfig-paths";
import { vitePluginTypescriptTransform } from "vite-plugin-typescript-transform";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    vitePluginTypescriptTransform({
      enforce: "pre",
      filter: { files: { include: /\.ts$/ } },
      tsconfig: { override: { target: ts.ScriptTarget.ES2024 } }
    })
  ],
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "**/*.pw.spec.ts"]
  }
});
