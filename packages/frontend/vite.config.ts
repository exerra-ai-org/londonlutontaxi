import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

function swBuildId(): Plugin {
  return {
    name: "sw-build-id",
    apply: "build",
    closeBundle() {
      const swPath = path.resolve(__dirname, "dist/sw.js");
      if (!existsSync(swPath)) return;
      const buildId =
        process.env.VITE_BUILD_ID ??
        (() => {
          try {
            return execSync("git rev-parse --short HEAD").toString().trim();
          } catch {
            return Date.now().toString(36);
          }
        })();
      const content = readFileSync(swPath, "utf-8");
      writeFileSync(swPath, content.replace("__BUILD_ID__", buildId));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swBuildId()],
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    port: 5173,
  },
});
