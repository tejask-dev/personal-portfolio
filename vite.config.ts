import { copyFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const outputDirectory = path.resolve(import.meta.dirname, "docs");

function spaFallback(): Plugin {
  return {
    name: "spa-fallback",
    apply: "build",
    closeBundle() {
      copyFileSync(
        path.join(outputDirectory, "index.html"),
        path.join(outputDirectory, "404.html"),
      );
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    spaFallback(),
    ...(mode === "development" ? [runtimeErrorOverlay()] : []),
  ],
  assetsInclude: ["**/*.JPEG", "**/*.JPG", "**/*.jpeg", "**/*.jpg", "**/*.pdf", "**/*.PDF"],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: '/',
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
