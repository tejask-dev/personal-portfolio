import { existsSync, readFileSync, statSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const outputDirectory = path.resolve(import.meta.dirname, "docs");

function staticRoutePreview(): Plugin {
  let resolvedOutput = outputDirectory;
  return {
    name: "static-route-preview",
    configResolved(config) {
      resolvedOutput = path.resolve(config.root, config.build.outDir);
    },
    // Match the static host: real prerendered routes, then a real HTTP 404.
    // Development keeps Vite's SPA fallback; production preview must not hide
    // missing routes behind the homepage.
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !["GET", "HEAD"].includes(req.method ?? "GET")) return next();
        let pathname: string;
        try { pathname = decodeURIComponent(new URL(req.url, "http://preview.local").pathname); }
        catch { res.statusCode = 400; res.end("Invalid URL"); return; }
        const target = path.resolve(resolvedOutput, `.${pathname}`);
        const inside = target === resolvedOutput || target.startsWith(resolvedOutput + path.sep);
        const candidates = [target, `${target}.html`, path.join(target, "index.html")];
        if (inside && candidates.some(file => existsSync(file) && statSync(file).isFile())) return next();
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(req.method === "HEAD" ? undefined : readFileSync(path.join(resolvedOutput, "404.html")));
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Parallel checkouts can share dependencies but must not replace each other's optimized modules.
  cacheDir: path.resolve(import.meta.dirname, "node_modules", `.vite-${path.basename(import.meta.dirname)}-${mode}`),
  plugins: [
    react(),
    staticRoutePreview(),
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
