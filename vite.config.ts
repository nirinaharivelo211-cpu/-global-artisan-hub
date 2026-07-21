import { defineConfig, Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import path from "node:path";
import fs from "node:fs";

const isVercel = process.env.VERCEL === "1";

const atAliasPlugin: Plugin = {
  name: "resolve-at-alias",
  resolveId(id, importer) {
    if (!id.startsWith("@/")) return null;
    const rel = id.slice(2);
    const base = path.resolve(__dirname, "frontend/tanstack", rel);
    const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".json"];
    for (const ext of exts) {
      if (fs.existsSync(base + ext)) return base + ext;
    }
    for (const ext of exts) {
      const idx = path.join(base, "index" + ext);
      if (fs.existsSync(idx)) return idx;
    }
    return base;
  },
};

export default defineConfig({
  css: { transformer: "lightningcss" },
  plugins: [
    atAliasPlugin,
    tailwindcss(),
    tanstackStart({
      srcDirectory: "frontend/tanstack",
      router: {
        autoCodeSplitting: false,
      },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    nitro({ preset: isVercel ? "vercel" : undefined }),
    react(),
    ...(!isVercel
      ? [
          {
            name: "serve-product-images",
            apply: "serve" as const,
            configureServer(server: any) {
              server.middlewares.use("/images", (req: any, res: any, next: any) => {
                const filePath = path.join(process.cwd(), "frontend/tanstack", "assets", req.url || "");
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                  const content = fs.readFileSync(filePath);
                  const ext = path.extname(filePath);
                  const mime: Record<string, string> = {
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".webp": "image/webp",
                  }[ext] || "application/octet-stream";
                  res.writeHead(200, { "Content-Type": mime, "Cache-Control": "public, max-age=3600" });
                  res.end(content);
                } else {
                  next();
                }
              });
            },
          },
        ]
      : []),
  ],
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100,
      },
    },
  },
});
