import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import path from "node:path";
import fs from "node:fs";

export default defineConfig({
  css: { transformer: "lightningcss" },
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
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
    react(),
    {
      name: "serve-product-images",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/images", (req, res, next) => {
          const filePath = path.join(process.cwd(), "frontend/tanstack", "assets", req.url || "");
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath);
            const ext = path.extname(filePath);
            const mime = {
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
