#!/usr/bin/env node
/**
 * Paper-Video 渲染器
 *
 * 逐场景渲染 + FFmpeg concat 拼接。
 *
 * Usage:
 *   node scripts/render.mjs --script input/msa_script.json --output output/msa_explained.mp4
 *
 * 每个 scene 独立渲染为 MP4 片段，最后用 FFmpeg 拼接。
 * 支持增量渲染：如果某个场景的片段已存在且脚本未变，跳过渲染。
 */
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
  openBrowser,
} from "@remotion/renderer";
import path from "path";
import fs from "fs";
import http from "http";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import {
  getRenderer,
  renderWithMotionCanvas,
  renderWithManim,
} from "./engine-router.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    parsed[key] = args[i + 1];
  }
  return parsed;
}

async function main() {
  const args = parseArgs();

  const scriptPath = args.script;
  const outputPath = args.output || "output/paper_video.mp4";

  if (!scriptPath) {
    console.error(
      "Usage: node scripts/render.mjs --script input/script.json [--output output/video.mp4]"
    );
    process.exit(1);
  }

  // Load script
  const script = JSON.parse(
    fs.readFileSync(path.resolve(projectRoot, scriptPath), "utf-8")
  );
  const scenes = script.scenes;

  console.log(
    `📄 Loaded script: ${script.meta.title} (${scenes.length} scenes)`
  );

  // Start local HTTP server to serve assets (audio, images, etc.)
  // Remotion's bundle can't access local filesystem paths directly.
  const assetServer = http.createServer((req, res) => {
    const filePath = path.join(projectRoot, decodeURIComponent(req.url.slice(1)));
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
    };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve) => assetServer.listen(0, "127.0.0.1", resolve));
  const assetPort = assetServer.address().port;
  const assetBaseUrl = `http://127.0.0.1:${assetPort}`;
  console.log(`🌐 Asset server: ${assetBaseUrl}`);

  // Rewrite all asset paths to use HTTP URLs
  for (const scene of scenes) {
    if (scene.audio?.file) {
      scene.audio.file = `${assetBaseUrl}/${scene.audio.file}`;
    }
    // Rewrite figure/image src paths
    if (scene.visual?.src && !scene.visual.src.startsWith("http")) {
      scene.visual.src = `${assetBaseUrl}/${scene.visual.src}`;
    }
  }

  // Create temp dir for scene fragments
  const tmpDir = path.resolve(projectRoot, "output", ".fragments");
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.dirname(path.resolve(projectRoot, outputPath)), {
    recursive: true,
  });

  // Bundle once
  console.log("📦 Bundling Remotion project...");
  const startBundle = Date.now();
  const serveUrl = await bundle({
    entryPoint: path.resolve(projectRoot, "src/index.ts"),
  });
  console.log(
    `✅ Bundle complete (${((Date.now() - startBundle) / 1000).toFixed(1)}s)`
  );

  // Open shared browser
  const browser = await openBrowser("chrome");

  const fragmentPaths = [];
  let totalRenderTime = 0;

  // Helper: render a single scene with Remotion
  async function renderWithRemotion(scene, index) {
    const fragmentPath = path.resolve(
      tmpDir,
      `scene_${String(index + 1).padStart(2, "0")}.mp4`
    );

    const inputProps = { scene, fps: 30 };

    const composition = await selectComposition({
      serveUrl,
      id: "SceneVideo",
      inputProps,
      puppeteerInstance: browser,
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      crf: 18,
      outputLocation: fragmentPath,
      inputProps,
      puppeteerInstance: browser,
    });

    return fragmentPath;
  }

  try {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const renderer = getRenderer(scene.type);
      const durationSec =
        scene.audio?.durationSeconds ?? scene.durationHint ?? 10;

      console.log(
        `🎬 Rendering scene ${i + 1}/${scenes.length}: ${scene.type} "${scene.id}" (${durationSec}s) [${renderer}]`
      );
      const startRender = Date.now();

      let fragmentPath;
      switch (renderer) {
        case "motion-canvas":
          fragmentPath = await renderWithMotionCanvas(
            scene, i, tmpDir, projectRoot
          );
          break;
        case "manim":
          fragmentPath = await renderWithManim(
            scene, i, tmpDir, projectRoot
          );
          break;
        default:
          fragmentPath = await renderWithRemotion(scene, i);
          break;
      }

      fragmentPaths.push(fragmentPath);

      const renderTime = (Date.now() - startRender) / 1000;
      totalRenderTime += renderTime;
      const fileSizeMB = (
        fs.statSync(fragmentPath).size /
        1024 /
        1024
      ).toFixed(1);
      console.log(
        `   ✅ Done (${renderTime.toFixed(1)}s, ${fileSizeMB}MB)`
      );
    }
  } finally {
    await browser.close({ silent: true });
    assetServer.close();
  }

  // FFmpeg concat
  console.log(`🔗 Concatenating ${fragmentPaths.length} fragments...`);
  const concatListPath = path.resolve(tmpDir, "concat.txt");
  const concatContent = fragmentPaths
    .map((fp) => `file '${fp}'`)
    .join("\n");
  fs.writeFileSync(concatListPath, concatContent);

  // Use Remotion's bundled ffmpeg
  const remotionFfmpeg = path.resolve(
    projectRoot,
    "node_modules/@remotion/compositor-darwin-arm64/ffmpeg"
  );
  const ffmpegBin = fs.existsSync(remotionFfmpeg) ? remotionFfmpeg : "ffmpeg";

  const finalOutput = path.resolve(projectRoot, outputPath);
  const ffmpegDir = path.dirname(path.resolve(projectRoot, ffmpegBin));
  // macOS SIP blocks DYLD_LIBRARY_PATH in child processes.
  // Workaround: cd to the ffmpeg directory so dylibs are found via @rpath/cwd.
  execSync(
    `cd "${ffmpegDir}" && ./ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${finalOutput}"`,
    { stdio: "pipe" }
  );

  const finalSize = (fs.statSync(finalOutput).size / 1024 / 1024).toFixed(1);
  console.log(`\n🎉 Video complete!`);
  console.log(`   📁 Output: ${finalOutput}`);
  console.log(`   📐 Size: ${finalSize}MB`);
  console.log(`   ⏱  Total render time: ${totalRenderTime.toFixed(1)}s`);
  console.log(`   🎞  Scenes: ${scenes.length}`);
}

main().catch((err) => {
  console.error("❌ Render failed:", err.message);
  process.exit(1);
});
