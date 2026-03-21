#!/usr/bin/env node
/**
 * Motion Canvas 渲染脚本
 *
 * 启动 Vite dev server → Playwright headless 打开 MC editor
 * → 配置 FFmpeg exporter → 触发渲染 → 等待 MP4 输出
 *
 * Usage:
 *   node scripts/render-mc.mjs [--output output/spike.mp4]
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
    const key = args[i].replace(/^--/, '');
    parsed[key] = args[i + 1];
  }
  return parsed;
}

async function main() {
  const args = parseArgs();
  const outputPath = args.output || path.join(projectRoot, 'output', 'spike.mp4');

  console.log('🎬 Motion Canvas Renderer');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Start Vite dev server
  console.log('📦 Starting Vite dev server...');
  const server = await createServer({
    root: projectRoot,
    configFile: path.join(projectRoot, 'vite.config.ts'),
    server: { port: 0 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' ? address?.port : 9000;
  const url = `http://localhost:${port}`;
  console.log(`   ✅ Vite @ ${url}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✅ MC editor loaded');
    await page.waitForTimeout(2000);

    // Configure rendering settings via the MC UI:
    // 1. Set rendering frame rate to 30
    // 2. Switch file type from png to video (FFmpeg)
    console.log('⚙️  Configuring render settings...');

    // Change rendering frame rate: find the Rendering section's frame rate dropdown
    // and set it to 30
    const renderingFpsSelect = page.locator('text=Rendering').locator('..').locator('select').first();

    // Use JS to configure the project's rendering settings directly
    await page.evaluate(() => {
      // Access MC's internal project state
      // MC stores settings in meta fields that persist via localStorage
      const meta = document.querySelector('[data-rendering]');
      if (meta) {
        console.log('Found rendering element');
      }
    });

    // The most reliable way: change the file type dropdown from "png" to the FFmpeg option
    // First, find and click the file type dropdown
    const fileTypeSelect = page.locator('select').filter({ hasText: 'png' });
    if (await fileTypeSelect.count() > 0) {
      // Check available options
      const options = await fileTypeSelect.locator('option').allTextContents();
      console.log(`   File type options: ${options.join(', ')}`);

      // Look for FFmpeg/video option
      const ffmpegOption = options.find(o =>
        o.toLowerCase().includes('ffmpeg') ||
        o.toLowerCase().includes('video') ||
        o.toLowerCase().includes('mp4')
      );

      if (ffmpegOption) {
        await fileTypeSelect.selectOption({ label: ffmpegOption });
        console.log(`   ✅ Selected exporter: ${ffmpegOption}`);
      } else {
        console.log('   ⚠️  No FFmpeg option found, trying alternate approach');
      }
    }

    // Also set rendering frame rate to 30
    // The frame rate dropdowns show "60" for rendering and "30" for preview
    const allSelects = await page.locator('select').all();
    for (const select of allSelects) {
      const value = await select.inputValue().catch(() => '');
      if (value === '60') {
        // This might be the rendering FPS - try setting to 30
        const opts = await select.locator('option').allTextContents();
        if (opts.includes('30')) {
          await select.selectOption('30');
          console.log('   ✅ Set rendering FPS to 30');
        }
      }
    }

    await page.waitForTimeout(500);

    // Take a pre-render screenshot for debugging
    await page.screenshot({ path: path.join(projectRoot, 'output', 'pre-render.png') });

    // Click RENDER button
    console.log('🎞  Triggering render...');
    const renderBtn = page.locator('button:has-text("RENDER")').first();
    await renderBtn.click();

    // Wait for rendering to complete
    console.log('   ⏳ Waiting for render...');
    const mcOutputDir = path.join(projectRoot, 'output');
    const maxWaitMs = 120000;
    const pollIntervalMs = 2000;
    let elapsed = 0;
    let found = false;

    while (elapsed < maxWaitMs) {
      await page.waitForTimeout(pollIntervalMs);
      elapsed += pollIntervalMs;

      // Check for MP4 output
      if (fs.existsSync(mcOutputDir)) {
        const files = fs.readdirSync(mcOutputDir)
          .filter(f => f.endsWith('.mp4'))
          .map(f => ({
            name: f,
            path: path.join(mcOutputDir, f),
            size: fs.statSync(path.join(mcOutputDir, f)).size,
          }))
          .filter(f => f.size > 1000);

        if (files.length > 0) {
          const mcOutput = files[files.length - 1];
          console.log(`   ✅ Render complete: ${mcOutput.name} (${(mcOutput.size / 1024).toFixed(1)}KB)`);

          if (path.resolve(mcOutput.path) !== path.resolve(outputPath)) {
            fs.copyFileSync(mcOutput.path, outputPath);
          }
          found = true;
          break;
        }
      }

      // Also check for image sequence (fallback detection)
      const imgDirs = fs.existsSync(mcOutputDir)
        ? fs.readdirSync(mcOutputDir).filter(f =>
            fs.statSync(path.join(mcOutputDir, f)).isDirectory()
          )
        : [];

      if (imgDirs.length > 0 && elapsed > 10000) {
        // Image sequence was produced instead of MP4
        // Convert with FFmpeg
        const seqDir = path.join(mcOutputDir, imgDirs[0]);
        const pngs = fs.readdirSync(seqDir).filter(f => f.endsWith('.png'));
        if (pngs.length > 5) {
          console.log(`   📸 Image sequence found (${pngs.length} frames), converting to MP4...`);
          try {
            execSync(
              `ffmpeg -y -framerate 30 -i "${seqDir}/%06d.png" ` +
              `-c:v libx264 -pix_fmt yuv420p -crf 18 "${outputPath}"`,
              { stdio: 'pipe' }
            );
            found = true;
            console.log('   ✅ Converted image sequence to MP4');
            break;
          } catch (e) {
            console.log(`   ⚠️  FFmpeg conversion failed: ${e.message}`);
          }
        }
      }

      if (elapsed % 10000 === 0) {
        console.log(`   ... still rendering (${elapsed / 1000}s)`);
        // Check what's in the output directory
        if (fs.existsSync(mcOutputDir)) {
          const contents = fs.readdirSync(mcOutputDir);
          console.log(`   ... output dir contents: ${contents.join(', ') || '(empty)'}`);
        }
      }
    }

    if (!found) {
      console.error('❌ Render timed out');
      await page.screenshot({ path: path.join(projectRoot, 'output', 'debug-timeout.png') });
      process.exit(1);
    }

    // Verify output
    console.log('🔍 Verifying output...');
    try {
      const ffprobeOut = execSync(
        `ffprobe -v quiet -print_format json -show_streams "${outputPath}"`,
        { encoding: 'utf-8' }
      );
      const probe = JSON.parse(ffprobeOut);
      const video = probe.streams.find(s => s.codec_type === 'video');
      if (video) {
        console.log(`   ${video.width}x${video.height} | ${video.r_frame_rate}fps | ${video.codec_name} | ${video.pix_fmt}`);
        const ok = video.width === 1920 && video.height === 1080
          && video.codec_name === 'h264' && video.pix_fmt === 'yuv420p';
        console.log(ok ? '   ✅ Format OK' : '   ⚠️  Format mismatch');
      }
    } catch {
      console.log('   ⚠️  ffprobe not available');
    }

  } finally {
    await browser.close();
    await server.close();
  }

  console.log(`\n🎉 Done: ${outputPath}`);
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
