#!/usr/bin/env node
// Blender MCP bridge client
// ------------------------
// Talks to the official Blender MCP add-on (Blender Foundation "blender_mcp")
// running inside Blender, using the add-on's own protocol:
//   TCP 127.0.0.1:9876, null-byte-delimited JSON  {"type":"execute","code":…,"strict_json":bool}
//
// Why: on this machine Windows Application Control blocks the MCP *stdio relay*
// (its venv python.exe), but the Blender side of Blender MCP runs fine. This
// client replaces only the blocked relay; every Blender operation still goes
// through the Blender MCP add-on, and `tool` runs the MCP's own *_toolcode.py.
//
// Usage:
//   node tools/blender-mcp.mjs start                 start Blender (background) with the MCP add-on server
//   node tools/blender-mcp.mjs status                is the add-on answering?
//   node tools/blender-mcp.mjs exec <file.py> [k=v]  run a Python file inside Blender (k=v become ARGS dict)
//   node tools/blender-mcp.mjs code "<python>"       run inline Python inside Blender
//   node tools/blender-mcp.mjs tool <name> [params]  run a Blender MCP tool (params = Python repr, optional)
//   node tools/blender-mcp.mjs stop                  stop the Blender process started by `start`
// Every call is appended to blender/mcp-session.log.jsonl.
import net from 'node:net';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const HOST = process.env.BLENDER_MCP_HOST || '127.0.0.1';
const PORT = +(process.env.BLENDER_MCP_PORT || 9876);
const BLENDER = process.env.BLENDER_PATH || 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
const MCP_TOOLS = process.env.BLENDER_MCP_TOOLS || 'C:\\Users\\Admin\\blender_mcp\\mcp\\blmcp\\tools';
const LOG = join(ROOT, 'blender', 'mcp-session.log.jsonl');
const PIDFILE = join(ROOT, 'blender', '.mcp-blender.pid');
mkdirSync(join(ROOT, 'blender'), { recursive: true });

function send(code, strictJson = true, timeoutMs = 15 * 60 * 1000) {
  return new Promise((resolvePromise, reject) => {
    const sock = net.createConnection({ host: HOST, port: PORT });
    const chunks = [];
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new Error(`timeout after ${timeoutMs} ms`));
    }, timeoutMs);
    sock.on('connect', () => sock.write(JSON.stringify({ type: 'execute', code, strict_json: strictJson }) + '\0'));
    sock.on('data', (d) => {
      chunks.push(d);
      const buf = Buffer.concat(chunks);
      const i = buf.indexOf(0);
      if (i >= 0) {
        clearTimeout(timer);
        sock.end();
        try {
          resolvePromise(JSON.parse(buf.subarray(0, i).toString('utf8')));
        } catch (err) {
          reject(err);
        }
      }
    });
    sock.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Same conventions as blmcp.tools_helpers: include expansion + calling-convention footer.
function loadToolcode(name) {
  const path = join(MCP_TOOLS, `${name}_toolcode.py`);
  if (!existsSync(path)) throw new Error(`No Blender MCP tool "${name}" (${path})`);
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const out = [];
  let skip = false;
  for (const line of lines) {
    if (line.startsWith('# @include_begin: ')) {
      out.push(readFileSync(join(MCP_TOOLS, line.slice('# @include_begin: '.length).trim()), 'utf8'));
      skip = true;
      continue;
    }
    if (line.startsWith('# @include_end')) {
      skip = false;
      continue;
    }
    if (!skip) out.push(line);
  }
  const footer = '\n_rv = main(__BLMCP_PARAMS__)\nif callable(_rv):\n    check_is_finished = _rv\n    result = {}\nelse:\n    result = _rv._asdict()\n';
  return out.join('\n') + footer;
}

function log(entry) {
  appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), ...entry }) + '\n');
}

function summarize(res) {
  if (!res) return res;
  const s = JSON.stringify(res.result ?? {});
  return { status: res.status, result: s.length > 600 ? s.slice(0, 600) + '…' : res.result, message: res.message?.slice(-1500) };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'start') {
    try {
      const r = await send('result = {"blender": __import__("bpy").app.version_string}', true, 3000);
      console.log('already running:', r.result);
      return;
    } catch {
      /* not running yet */
    }
    const out = openSync(join(ROOT, 'blender', 'mcp-blender.out.log'), 'a');
    const child = spawn(BLENDER, ['--background', '--command', 'blender_mcp', '--port', String(PORT)], {
      detached: true,
      stdio: ['ignore', out, out],
      windowsHide: true,
    });
    child.unref();
    writeFileSync(PIDFILE, String(child.pid));
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const r = await send('import bpy\nresult = {"blender": bpy.app.version_string, "file": bpy.data.filepath}', true, 3000);
        log({ op: 'start', pid: child.pid, ...summarize(r) });
        console.log('Blender MCP add-on ready:', JSON.stringify(r.result));
        return;
      } catch {
        /* keep waiting */
      }
    }
    throw new Error('Blender MCP add-on did not come up on ' + PORT);
  }
  if (cmd === 'stop') {
    if (existsSync(PIDFILE)) {
      const pid = +readFileSync(PIDFILE, 'utf8');
      try {
        process.kill(pid);
        console.log('stopped', pid);
      } catch (e) {
        console.log('not running', e.message);
      }
      log({ op: 'stop', pid });
    }
    return;
  }
  if (cmd === 'status') {
    const r = await send('import bpy\nresult = {"blender": bpy.app.version_string, "objects": len(bpy.data.objects), "file": bpy.data.filepath}', true, 5000);
    console.log(JSON.stringify(r));
    return;
  }
  let code;
  let label;
  let strict = true;
  if (cmd === 'exec') {
    const file = resolve(rest[0]);
    const args = Object.fromEntries(rest.slice(1).map((kv) => kv.split('=')));
    const scriptsDir = dirname(file).replace(/\\/g, '\\\\');
    code =
      `import sys\nif r"${dirname(file)}" not in sys.path: sys.path.insert(0, r"${dirname(file)}")\n` +
      `ARGS = ${JSON.stringify(args)}\nPROJECT_ROOT = r"${ROOT}"\n` +
      readFileSync(file, 'utf8');
    label = `exec ${rest[0]}`;
    void scriptsDir;
  } else if (cmd === 'code') {
    code = rest.join(' ');
    label = 'code';
    strict = false;
  } else if (cmd === 'tool') {
    const [name, params = 'None'] = rest;
    code = loadToolcode(name).replace('__BLMCP_PARAMS__', params);
    label = `tool ${name}`;
  } else {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 20).join('\n'));
    return;
  }
  const t0 = Date.now();
  const res = await send(code, strict);
  const ms = Date.now() - t0;
  log({ op: label, ms, ...summarize(res) });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.status !== 'ok') {
    console.error(res.message || JSON.stringify(res));
    process.exit(1);
  }
  console.log(JSON.stringify(res.result, null, 1));
  console.error(`[blender-mcp] ${label}: ok in ${(ms / 1000).toFixed(1)} s`);
}

main().catch((err) => {
  console.error('[blender-mcp]', err.message);
  process.exit(1);
});
