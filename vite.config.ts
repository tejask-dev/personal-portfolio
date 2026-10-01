import { copyFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const outputDirectory = path.resolve(import.meta.dirname, "docs");

function spaFallback(): Plugin {
  let resolvedOutput = outputDirectory;
  return {
    name: "spa-fallback",
    apply: "build",
    configResolved(config) {
      resolvedOutput = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyFileSync(
        path.join(resolvedOutput, "index.html"),
        path.join(resolvedOutput, "404.html"),
      );
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Parallel checkouts can share dependencies but must not replace each other's optimized modules.
  cacheDir: path.resolve(import.meta.dirname, "node_modules", `.vite-${path.basename(import.meta.dirname)}-${mode}`),
  plugins: [
    react(),
    spaFallback(),
    ...(mode === "development" ? [runtimeErrorOverlay()] : []),
  ],
  assetsInclude: [
    "**/*.JPEG",
    "**/*.JPG",
    "**/*.jpeg",
    "**/*.jpg",
    "**/*.pdf",
    "**/*.PDF",
  ],
  resolve: {
    dedupe: ["react", "react-dom", "three"],
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: "/",
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
