import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "..");

// Copy product images from frontend/tanstack/assets to dist/client/images
const src = resolve(projectRoot, "frontend", "tanstack", "assets");
const dest = resolve(projectRoot, "dist", "client", "images");

if (existsSync(src)) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
  console.log("[copy-assets] images copied to dist/client/images/");
} else {
  console.log("[copy-assets] source not found, skipping");
}
