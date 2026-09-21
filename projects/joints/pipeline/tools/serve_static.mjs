#!/usr/bin/env node
// Production-like static server for the performance lab (and the documented deployment contract):
//   node pipeline/tools/serve_static.mjs <dir> <port>
// - brotli / gzip negotiated for text and binary glTF (meshopt payloads are designed to be compressed on the wire)
// - hashed bundle files (/app/*) are immutable; everything else is `no-cache` + strong ETag (304 on repeat visits)
// Development/QA tool only; not part of the shipped runtime.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const dir = resolve(process.argv[2] ?? "dist");
const port = Number(process.argv[3] ?? 4175);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".glb": "model/gltf-binary", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".map": "application/json", ".ktx2": "image/ktx2", ".bin": "application/octet-stream", ".rgbe": "application/octet-stream" };
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".glb", ".svg", ".map", ".bin", ".rgbe"]);
const cache = new Map();

function entry(path) {
  const st = statSync(path);
  const hit = cache.get(path);
  if (hit && hit.mtime === st.mtimeMs) return hit;
  const raw = readFileSync(path);
  const e = { mtime: st.mtimeMs, raw, etag: `"${createHash("sha256").update(raw).digest("hex").slice(0, 32)}"`, br: null, gz: null };
  cache.set(path, e);
  return e;
}

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const path = normalize(join(dir, rel));
  if (!path.startsWith(dir)) return res.writeHead(403).end();
  const file = existsSync(path) && statSync(path).isFile() ? path : join(dir, "index.html");
  const ext = extname(file);
  const e = entry(file);
  const headers = { "Content-Type": TYPES[ext] ?? "application/octet-stream", ETag: e.etag, Vary: "Accept-Encoding", "Cache-Control": rel.startsWith("/app/") ? "public, max-age=31536000, immutable" : "no-cache", "Timing-Allow-Origin": "*" };
  if (req.headers["if-none-match"] === e.etag) return res.writeHead(304, headers).end();
  const accept = String(req.headers["accept-encoding"] ?? "");
  let body = e.raw;
  if (COMPRESSIBLE.has(ext) && e.raw.byteLength > 1024) {
    if (/\bbr\b/.test(accept)) {
      e.br ??= brotliCompressSync(e.raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 9, [constants.BROTLI_PARAM_SIZE_HINT]: e.raw.byteLength } });
      body = e.br;
      headers["Content-Encoding"] = "br";
    } else if (/\bgzip\b/.test(accept)) {
      e.gz ??= gzipSync(e.raw, { level: 9 });
      body = e.gz;
      headers["Content-Encoding"] = "gzip";
    }
  }
  headers["Content-Length"] = body.byteLength;
  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}).listen(port, () => console.log(`serving ${dir} on http://localhost:${port}`));
