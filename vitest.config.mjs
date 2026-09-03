import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: false,
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./test/server-only.ts"),
      "@": path.resolve(__dirname, "./"),
    },
  },
});
