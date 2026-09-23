// Dev-server-only QA endpoints (never in production builds; apply: 'serve'):
//   POST /__qa/capture   save a rendered frame from the QA overlay (?qa=1) to docs/qa/captures/
//   GET  /__qa/audio/*   serve the generated audio test fixture (web/.qa-audio, git-ignored)
//                        so narration sync can be tested with ?qa-audio=fixture
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'docs', 'qa', 'captures');
const fixtureDir = join(here, '..', '.qa-audio');

export function qaCapture() {
  return {
    name: 'qa-capture',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__qa/capture', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { name, dataUrl } = JSON.parse(body);
            const safe = String(name).replace(/[^a-z0-9_.-]/gi, '_').slice(0, 80);
            mkdirSync(outDir, { recursive: true });
            writeFileSync(join(outDir, `${safe}.jpg`), Buffer.from(dataUrl.split(',')[1], 'base64'));
            res.end('ok');
          } catch (err) {
            res.statusCode = 400;
            res.end(String(err));
          }
        });
      });
      server.middlewares.use('/__qa/audio', (req, res) => {
        const name = normalize(decodeURIComponent((req.url || '/').split('?')[0])).replace(/^[\\/]+/, '');
        const file = join(fixtureDir, name);
        if (!file.startsWith(fixtureDir) || !existsSync(file)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        const buf = readFileSync(file);
        const type = file.endsWith('.json') ? 'application/json' : 'audio/wav';
        // byte ranges: audio elements seek with Range requests
        const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
        res.setHeader('Content-Type', type);
        res.setHeader('Accept-Ranges', 'bytes');
        if (range) {
          const start = range[1] ? +range[1] : 0;
          const end = range[2] ? Math.min(+range[2], buf.length - 1) : buf.length - 1;
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${buf.length}`);
          res.setHeader('Content-Length', end - start + 1);
          res.end(buf.subarray(start, end + 1));
        } else {
          res.setHeader('Content-Length', buf.length);
          res.end(buf);
        }
      });
    },
  };
}
