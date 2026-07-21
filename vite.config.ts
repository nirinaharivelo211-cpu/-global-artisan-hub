import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import path from "node:path";
import fs from "node:fs";

const isVercel = process.env.VERCEL === "1";

const ROOT = path.resolve(__dirname, "frontend", "tanstack");
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".json"];

function resolveWithExt(p: string): string | null {
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  for (const ext of EXTS) {
    if (fs.existsSync(p + ext)) return p + ext;
  }
  for (const ext of EXTS) {
    const idx = path.join(p, "index" + ext);
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

export default defineConfig({
  css: { transformer: "lightningcss" },
  plugins: [
    {
      name: "resolve-at-and-relative",
      enforce: "pre",
      resolveId(id, importer) {
        if (id.startsWith("@/")) {
          return resolveWithExt(path.join(ROOT, id.slice(2)));
        }
        if (id.startsWith(".") && importer) {
          const dir = importer.includes("/") || importer.includes("\\")
            ? path.dirname(importer)
            : ROOT;
          return resolveWithExt(path.join(dir, id));
        }
        return null;
      },
    },
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
