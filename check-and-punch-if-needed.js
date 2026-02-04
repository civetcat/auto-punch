#!/usr/bin/env node
/**
 * Standalone script: check if we need to punch out now (weekday 17:00+, at or near off-time).
 * Used by tray (startup) and native host (Extension toggle) so the check runs in its own process.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const t = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
  const hour = t.getUTCHours(), day = t.getUTCDay();
  if (day === 0 || day === 6 || hour < 17) return;
  try {
    const { stdout } = await execAsync('node punch.js --get-offtime', { cwd: __dirname, timeout: 60000 });
    const line = stdout.trim().split('\n').pop();
    if (!line) return;
    const off = JSON.parse(line);
    const now = new Date();
    const taipeiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const ty = taipeiNow.getUTCFullYear(), tm = taipeiNow.getUTCMonth(), td = taipeiNow.getUTCDate();
    let utcH = off.hour - 8, utcD = td;
    if (utcH < 0) { utcH += 24; utcD -= 1; }
    const offTimeMs = Date.UTC(ty, tm, utcD, utcH, off.minute, off.second);
    if (now.getTime() >= offTimeMs - 2 * 60 * 1000) {
      await execAsync('node punch.js', { cwd: __dirname });
    }
  } catch (e) {}
}

main();
