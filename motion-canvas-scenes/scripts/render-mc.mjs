#!/usr/bin/env node
/**
 * Motion Canvas 渲染脚本 v2
 *
 * 支持两种模式：
 * 1. 独立模式：自启 Vite + Playwright（单场景用）
 * 2. 复用模式：--server-url 指定已运行的 Vite server（多场景批量用）
 *
 * Usage:
 *   node scripts/render-mc.mjs --output output/scene.mp4
 *   node scripts/render-mc.mjs --output output/scene.mp4 --server-url http://localhost:9000
 */

import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i]?.startsWith('--')) {
      parsed[args[i].replace(/^--/, '')] = args[i + 1];
    }
  }
  return parsed;
}

async function main() {
  const args = parseArgs();
  const outputPath = args.output || path.join(projectRoot, 'output', 'render.mp4');
  const externalServerUrl = args['server-url'];

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let server = null;
  let url = externalServerUrl;

  // Start Vite only if no external server provided
  if (!url) {
    server = await createServer({
      root: projectRoot,
      configFile: path.join(projectRoot, 'vite.config.ts'),
      server: { port: 0 },
    });
    await server.listen();
    const address = server.httpServer?.address();
    const port = typeof address === 'object' ? address?.port : 9000;
    url = `http://localhost:${port}`;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);

    // Click RENDER button
    const renderBtn = page.locator('button:has-text("RENDER")').first();
    if (await renderBtn.isVisible()) {
      await renderBtn.click();
    }

    // Wait for image sequence output
    const mcOutputDir = path.join(projectRoot, 'output');
    const maxWaitMs = 180000;
    const pollMs = 1500;
    let elapsed = 0;
    let found = false;

    while (elapsed < maxWaitMs) {
      await page.waitForTimeout(pollMs);
      elapsed += pollMs;

      if (!fs.existsSync(mcOutputDir)) continue;

      // Check for image sequence directories
      const dirs = fs.readdirSync(mcOutputDir).filter(f => {
        const p = path.join(mcOutputDir, f);
        return fs.statSync(p).isDirectory() && f !== '.fragments';
      });

      for (const dir of dirs) {
        const seqDir = path.join(mcOutputDir, dir);
        const pngs = fs.readdirSync(seqDir).filter(f => f.endsWith('.png'));
        if (pngs.length > 3) {
          // Wait a bit more to ensure all frames are written
          await page.waitForTimeout(2000);
          const finalPngs = fs.readdirSync(seqDir).filter(f => f.endsWith('.png'));

          try {
            execSync(
              `ffmpeg -y -framerate 30 -i "${seqDir}/%06d.png" ` +
              `-c:v libx264 -pix_fmt yuv420p -crf 18 "${outputPath}"`,
              { stdio: 'pipe' }
            );
            found = true;
          } catch (e) {
            // Try alternate naming pattern
            execSync(
              `ffmpeg -y -framerate 30 -pattern_type glob -i "${seqDir}/*.png" ` +
              `-c:v libx264 -pix_fmt yuv420p -crf 18 "${outputPath}"`,
              { stdio: 'pipe' }
            );
            found = true;
          }
          break;
        }
      }

      if (found) break;

      // Also check for direct MP4 output
      const mp4s = fs.readdirSync(mcOutputDir).filter(f =>
        f.endsWith('.mp4') && fs.statSync(path.join(mcOutputDir, f)).size > 1000
      );
      if (mp4s.length > 0) {
        const src = path.join(mcOutputDir, mp4s[mp4s.length - 1]);
        if (path.resolve(src) !== path.resolve(outputPath)) {
          fs.copyFileSync(src, outputPath);
        }
        found = true;
        break;
      }
    }

    if (!found) {
      await page.screenshot({ path: path.join(mcOutputDir, 'debug-timeout.png') });
      throw new Error('Render timed out');
    }

  } finally {
    await browser.close();
    if (server) await server.close();
  }
}

main().catch(err => {
  console.error('❌ MC render failed:', err.message);
  process.exit(1);
});
