// Minimal static server for running the lesson locally (no Python needed).
//   node scripts/serve.js [port]
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.argv[2] || process.env.PORT || 8000);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css",
  ".json": "application/json", ".glb": "model/gltf-binary", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
};

http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split("?")[0]); } catch { res.writeHead(400); return res.end(); }
  if (urlPath === "/") urlPath = "/respiratory_system.html";
  const file = path.join(root, path.normalize(urlPath));
  const rel = path.relative(root, file);
  // stay inside the folder and never serve dotfiles such as .env
  if (rel.startsWith("..") || rel.split(path.sep).some(p => p.startsWith("."))) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Content-Length": st.size });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, () => console.log(`Lesson running at http://localhost:${port}/respiratory_system.html`));
