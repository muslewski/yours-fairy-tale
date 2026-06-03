import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@payload-config": fileURLToPath(
        new URL("./payload.config.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup-env.ts"],
    // Each test file boots its own Payload instance, which pulls/pushes the schema
    // against the single local Postgres. Running files in parallel races on that DB,
    // so serialize them. (Tests are DB-bound, not CPU-bound — little speed cost.)
    fileParallelism: false,
  },
});
