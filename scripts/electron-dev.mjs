import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

function localBin(name) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  return path.join(process.cwd(), 'node_modules', '.bin', `${name}${ext}`);
}

async function main() {
  const projectRoot = process.cwd();
  const viteBin = localBin('vite');
  const electronBin = localBin('electron');

  if (!fs.existsSync(viteBin)) {
    throw new Error(`vite binary not found: ${viteBin}`);
  }
  if (!fs.existsSync(electronBin)) {
    throw new Error(`electron binary not found: ${electronBin}`);
  }
  console.log(`[electron-dev] cwd=${projectRoot}`);
  console.log(`[electron-dev] vite=${viteBin}`);
  console.log(`[electron-dev] electron=${electronBin}`);

  const vite = spawn(viteBin, ['--host', '--port', '5173'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: projectRoot,
    env: { ...process.env },
  });

  let electron = null;
  let resolved = false;

  const tryLaunchElectron = (text) => {
    if (resolved) return;
    const m = text.match(/Local:\s+http:\/\/localhost:(\d+)\//);
    if (!m) return;
    const port = Number(m[1]);
    if (!Number.isFinite(port) || port <= 0) return;
    const url = `http://localhost:${port}`;
    resolved = true;
    console.log(`[electron-dev] using ${url}`);

    electron = spawn(electronBin, ['.'], {
      stdio: 'inherit',
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VITE_DEV_SERVER_URL: url,
      },
    });

    electron.on('exit', (code, signal) => {
      try { vite.kill('SIGTERM'); } catch {}
      if (signal) {
        console.error(`[electron-dev] electron exited by signal ${signal}`);
        process.exit(1);
      }
      process.exit(code ?? 0);
    });
  };

  const onViteData = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    tryLaunchElectron(text);
  };

  vite.stdout.on('data', onViteData);
  vite.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    tryLaunchElectron(text);
  });

  vite.on('exit', (code) => {
    if (!resolved) {
      console.error(`[electron-dev] vite exited before ready (code=${code ?? 0})`);
      process.exit(code ?? 1);
      return;
    }
    if (electron && !electron.killed) {
      try { electron.kill('SIGTERM'); } catch {}
    }
  });

  const shutdown = () => {
    try { if (electron && !electron.killed) electron.kill('SIGTERM'); } catch {}
    try { if (!vite.killed) vite.kill('SIGTERM'); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[electron-dev] failed:', err.message || err);
  process.exit(1);
});
