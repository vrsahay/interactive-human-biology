// Fails if any file that git would commit contains something that looks like a credential.
// Runs before every build (npm run build) and on its own: npm run check:secrets
//   --dist   also report what the built site exposes to browsers (informational)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { DIST, ROOT } from "./lib/config.mjs";

const PATTERNS = [
  ["Google API key", /AIza[0-9A-Za-z_-]{35}/],
  ["AWS access key", /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["Private key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["OpenAI/Anthropic key", /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}/],
  ["Stripe live key", /\b[sr]k_live_[A-Za-z0-9]{20,}/],
  ["Google service account", /"type"\s*:\s*"service_account"/],
  ["Hard-coded secret", /\b(?:api[_-]?key|secret|token|passw(?:or)?d)\b["']?\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{24,}["']/i],
];
const BINARY = new Set([".glb", ".bin", ".blend", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".ico", ".mp3", ".wav", ".ogg", ".mp4", ".webm", ".rgbe", ".hdr", ".ktx2", ".woff", ".woff2", ".ttf", ".otf", ".zip", ".gz", ".wasm"]);
const SECRET_FILES = /(^|\/)(\.env(\..+)?|config\.js|.*-service-account.*\.json|.*credentials.*\.json|.*\.(pem|p12|key))$/;

const git = (args) => {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\0").filter(Boolean); }
  catch { return null; }                                   // not a git checkout (e.g. some CI/hosting build containers)
};
// Without git, approximate "committable" as every file outside node_modules/, dist/ and .git/, minus git-ignored secret files.
const files = (git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
  ?? walk(ROOT, /^(node_modules|dist|\.git|test-results)$/).map((p) => relative(ROOT, p).replaceAll("\\", "/")).filter((f) => !SECRET_FILES.test(f)))
  .filter((f) => existsSync(join(ROOT, f)));

const findings = scan(files.map((f) => [f, join(ROOT, f)]));
const committable = files.filter((f) => SECRET_FILES.test(f) && !f.endsWith(".env.example") && !/build-config\.js$/.test(f));
for (const f of committable) findings.push(`${f}: a secrets file would be committed (add it to .gitignore)`);

if (findings.length) {
  console.error(`✗ Possible secrets in files that would be committed:\n  - ${findings.join("\n  - ")}`);
  process.exit(1);
}
const ignored = (git(["ls-files", "--others", "--ignored", "--exclude-standard", "-z"]) ?? [])
  .filter((f) => !f.includes("node_modules/") && !f.startsWith("dist/") && SECRET_FILES.test(f));
console.log(`✓ No secrets in ${files.length} committable files.${ignored.length ? ` Local, git-ignored secret files (never committed): ${ignored.join(", ")}` : ""}`);

if (process.argv.includes("--dist") && existsSync(DIST)) {
  const exposed = scan(walk(DIST).map((p) => [relative(DIST, p).replaceAll("\\", "/"), p]));
  if (exposed.length) console.warn(`! Values in the built site that every visitor can read:\n  - ${exposed.join("\n  - ")}`);
  else console.log("✓ The built site contains no credential-like values.");
}

function scan(entries) {
  const out = [];
  for (const [label, path] of entries) {
    if (BINARY.has(extname(path).toLowerCase()) || /package-lock\.json$/.test(label)) continue;
    if (statSync(path).size > 8 * 1024 * 1024) continue;
    const text = readFileSync(path, "utf8");
    if (text.includes("\0")) continue;
    for (const [name, re] of PATTERNS) {
      const m = re.exec(text);
      if (m) out.push(`${label}:${text.slice(0, m.index).split("\n").length} ${name} (${m[0].slice(0, 6)}…)`);
    }
  }
  return out;
}

function walk(dir, skip = /^$/) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => !skip.test(e.name))
    .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name), skip) : [join(dir, e.name)]));
}
