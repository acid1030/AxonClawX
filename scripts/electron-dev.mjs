import http from 'http';
import { spawn } from 'child_process';

const startPort = 5173;
const endPort = 5200;
const timeoutMs = 500;
const maxAttempts = 240; // ~2min

function canReach(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findDevServer() {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    for (let port = startPort; port <= endPort; port += 1) {
      const ok = await canReach(`http://127.0.0.1:${port}`);
      if (ok) return port;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No Vite dev server found on ${startPort}-${endPort}`);
}

async function main() {
  const port = await findDevServer();
  const url = `http://localhost:${port}`;
  console.log(`[electron-dev] using ${url}`);

  const child = spawn('electron', ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: url,
    },
    shell: true,
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error('[electron-dev] failed:', err.message || err);
  process.exit(1);
});
