import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(import.meta.dirname, "..", "src", "assets");
const dest = resolve(import.meta.dirname, "..", "dist", "client", "images");

if (existsSync(src)) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
  console.log("[copy-assets] images copied to dist/client/images/");
}
