// Serves dist/ exactly like a static host would: folder index.html, "/joints" → "/joints/" redirect, 404.html.
//   node scripts/serve.mjs [port]      (default 8080, or $PORT)
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, sep } from "node:path";
import { DIST, SITE_BASE } from "./lib/config.mjs";

const port = Number(process.argv[2] || process.env.PORT || 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".map": "application/json",
  ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".rgbe": "application/octet-stream",
  ".hdr": "application/octet-stream", ".ktx2": "image/ktx2", ".wasm": "application/wasm",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".mp4": "video/mp4", ".webm": "video/webm",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".txt": "text/plain; charset=utf-8",
};

if (!existsSync(join(DIST, "index.html"))) {
  console.error('dist/ is empty — run "npm run build" first.');
  process.exit(1);
}

createServer((req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }
  if (!path.startsWith(SITE_BASE)) return redirect(res, SITE_BASE);
  const file = normalize(join(DIST, path.slice(SITE_BASE.length)));
  const rel = relative(DIST, file);
  if (rel.startsWith("..") || rel.split(sep).some((p) => p.startsWith("."))) { res.writeHead(403); return res.end(); }

  let target = file;
  if (existsSync(target) && statSync(target).isDirectory()) {
    if (!path.endsWith("/")) return redirect(res, path + "/" + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""));
    target = join(target, "index.html");
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    console.warn(`404 ${path}`);
    return send(res, join(DIST, "404.html"), 404);
  }
  send(res, target, 200, req);
}).listen(port, () => console.log(`Interactive Biology → http://localhost:${port}${SITE_BASE}`));

function send(res, file, status, req) {
  const size = statSync(file).size;
  const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
  const range = req?.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range && status === 200) {                       // audio/video seeking
    const start = range[1] ? Number(range[1]) : size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1, "Accept-Ranges": "bytes" });
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(status, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" });
  createReadStream(file).pipe(res);
}

function redirect(res, location) {
  res.writeHead(301, { Location: location });
  res.end();
}
