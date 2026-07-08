import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

const serverEntry = await import("./dist/server/server.js");
const handler = serverEntry.default || serverEntry;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const clientDir = new URL("./dist/client/", import.meta.url);

function serveStatic(urlPath) {
  const filePath = resolve(clientDir.pathname, urlPath.replace(/^\//, ""));
  if (!filePath.startsWith(clientDir.pathname)) return null;
  if (!existsSync(filePath)) return null;
  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] || "application/octet-stream";
  const content = readFileSync(filePath);
  return new Response(content, {
    headers: { "content-type": mime, "cache-control": "public, max-age=31536000, immutable" },
  });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    const staticRes = serveStatic(url.pathname);
    if (staticRes) {
      res.writeHead(staticRes.status, Object.fromEntries(staticRes.headers));
      const buf = Buffer.from(await staticRes.arrayBuffer());
      return res.end(buf);
    }

    const protocol = req.socket.encrypted ? "https" : "http";
    const requestUrl = `${protocol}://${req.headers.host || `localhost:${PORT}`}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const body = req.method !== "GET" && req.method !== "HEAD"
      ? await new Promise((resolve) => {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => resolve(Buffer.concat(chunks)));
        })
      : null;

    const request = new Request(requestUrl, {
      method: req.method,
      headers,
      body,
    });

    const response = await handler.fetch(request, {}, {});
    res.writeHead(response.status, Object.fromEntries(response.headers));

    if (response.body) {
      const reader = response.body.getReader();
      const pump = () => {
        reader.read().then(({ done, value }) => {
          if (done) return res.end();
          res.write(Buffer.from(value));
          pump();
        });
      };
      pump();
    } else {
      res.end();
    }
  } catch (err) {
    console.error("Server error:", err);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error");
  }
}).listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
