import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: "web",
          globals: true,
          environment: "jsdom",
          setupFiles: ["apps/web/src/test/setup.ts"],
          include: ["apps/web/src/**/*.test.{ts,tsx}", "e2e/**/*.test.{ts,tsx}"],
          exclude: ["node_modules/**", ".next/**"],
        },
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
            "@hem/ui": fileURLToPath(new URL("./packages/ui/src", import.meta.url)),
          },
        },
      },
      {
        plugins: [react()],
        test: {
          name: "admin",
          globals: true,
          environment: "jsdom",
          setupFiles: ["apps/admin/src/test/setup.ts"],
          include: ["apps/admin/src/**/*.test.{ts,tsx}"],
          exclude: ["node_modules/**", ".next/**"],
        },
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./apps/admin/src", import.meta.url)),
            "@hem/ui": fileURLToPath(new URL("./packages/ui/src", import.meta.url)),
          },
        },
      },
    ],
  },
});
