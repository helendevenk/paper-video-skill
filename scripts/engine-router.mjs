/**
 * Engine Router — 根据 scene type 选择渲染引擎
 *
 * Remotion: title, bullet, figure, code, formula, compare, summary
 * Motion Canvas: code_diff, formula_derive, algorithm, flowchart
 * Manim: arch_3d, math_3d (Phase 2C)
 */

import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

/**
 * Recursively find a file by name in a directory.
 */
function findFile(dir, fileName) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(fullPath, fileName);
      if (found) return found;
    } else if (entry.name === fileName) {
      return fullPath;
    }
  }
  return null;
}

const MC_TYPES = ['code_diff', 'formula_derive', 'algorithm', 'flowchart'];
const MANIM_TYPES = ['arch_3d', 'math_3d'];

/**
 * 根据 scene type 返回渲染引擎名称
 */
export function getRenderer(sceneType) {
  if (MC_TYPES.includes(sceneType)) return 'motion-canvas';
  if (MANIM_TYPES.includes(sceneType)) return 'manim';
  return 'remotion';
}

/**
 * Motion Canvas 渲染：启动 Vite + Playwright headless → 图片序列 → FFmpeg MP4
 *
 * @param {object} scene - scene 数据
 * @param {number} index - scene 索引
 * @param {string} tmpDir - 临时目录
 * @param {string} projectRoot - paper-video 根目录
 * @returns {string} 输出 MP4 路径
 */
export async function renderWithMotionCanvas(scene, index, tmpDir, projectRoot) {
  const fragmentPath = path.join(
    tmpDir,
    `scene_${String(index + 1).padStart(2, '0')}.mp4`
  );

  const mcDir = path.join(projectRoot, 'motion-canvas-scenes');

  // Write scene data to temp file for MC to consume
  const sceneDataPath = path.join(tmpDir, `mc_data_${index}.json`);
  fs.writeFileSync(sceneDataPath, JSON.stringify(scene, null, 2));

  // MC 渲染：启动 Vite → Playwright → 图片序列 → FFmpeg 转 MP4
  // 调用 MC 项目的渲染脚本
  try {
    execSync(
      `node "${path.join(mcDir, 'scripts/render-mc.mjs')}" ` +
      `--output "${fragmentPath}"`,
      {
        stdio: 'pipe',
        cwd: mcDir,
        timeout: 120000,
      }
    );
  } catch (err) {
    console.error(`   ❌ MC render failed: ${err.stderr?.toString()?.slice(-200) || err.message}`);
    throw err;
  }

  // Mux audio if scene has audio (统一后期 FFmpeg mux)
  if (scene.audio?.file) {
    const withAudio = fragmentPath.replace('.mp4', '_audio.mp4');
    try {
      execSync(
        `ffmpeg -y -i "${fragmentPath}" -i "${scene.audio.file}" ` +
        `-c:v copy -c:a aac -shortest "${withAudio}"`,
        { stdio: 'pipe' }
      );
      fs.renameSync(withAudio, fragmentPath);
    } catch (err) {
      console.warn(`   ⚠️ Audio mux failed, using video without audio`);
    }
  }

  return fragmentPath;
}

/**
 * Manim 渲染：venv 隔离 + scene data 通过环境变量传入
 */
export async function renderWithManim(scene, index, tmpDir, projectRoot) {
  const fragmentPath = path.join(
    tmpDir,
    `scene_${String(index + 1).padStart(2, '0')}.mp4`
  );

  const manimDir = path.join(projectRoot, 'manim-scenes');
  const venvPython = path.join(manimDir, '.venv', 'bin', 'python3');
  const outputName = `scene_${String(index + 1).padStart(2, '0')}.mp4`;

  // Write scene data for Manim to consume via SCENE_DATA_PATH env var
  const sceneDataPath = path.join(tmpDir, `manim_data_${index}.json`);
  fs.writeFileSync(sceneDataPath, JSON.stringify(scene, null, 2));

  // Map scene type to Manim class name (arch_3d → Arch3DScene)
  const sceneClass = scene.type.split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('') + 'Scene';

  try {
    execSync(
      `"${venvPython}" -m manim render ` +
      `-ql --fps 30 -r 1920,1080 ` +
      `scenes/${scene.type}.py ${sceneClass} ` +
      `-o "${outputName}"`,
      {
        stdio: 'pipe',
        timeout: 120000,
        cwd: manimDir,
        env: { ...process.env, SCENE_DATA_PATH: sceneDataPath },
      }
    );

    // Manim outputs to media/videos/{scene_file}/1080p30/{outputName}
    const manimOutput = path.join(
      manimDir, 'media', 'videos', scene.type, '1080p30', outputName
    );
    if (fs.existsSync(manimOutput)) {
      fs.copyFileSync(manimOutput, fragmentPath);
    } else {
      // Search for the output file
      const mediaDir = path.join(manimDir, 'media', 'videos');
      const found = findFile(mediaDir, outputName);
      if (found) {
        fs.copyFileSync(found, fragmentPath);
      } else {
        throw new Error(`Manim output not found: ${outputName}`);
      }
    }
  } catch (err) {
    // Graceful degradation: fallback to static colored frame
    console.error(`   ❌ Manim render failed: ${err.message?.slice(0, 100)}`);
    console.error(`   ⚠️ Generating fallback frame`);
    execSync(
      `ffmpeg -y -f lavfi -i color=c=0x0f172a:s=1920x1080:d=${scene.durationHint || 5} ` +
      `-c:v libx264 -pix_fmt yuv420p "${fragmentPath}"`,
      { stdio: 'pipe' }
    );
  }

  // Audio mux
  if (scene.audio?.file) {
    const withAudio = fragmentPath.replace('.mp4', '_audio.mp4');
    try {
      execSync(
        `ffmpeg -y -i "${fragmentPath}" -i "${scene.audio.file}" ` +
        `-c:v copy -c:a aac -shortest "${withAudio}"`,
        { stdio: 'pipe' }
      );
      fs.renameSync(withAudio, fragmentPath);
    } catch {
      console.warn(`   ⚠️ Audio mux failed for Manim scene`);
    }
  }

  return fragmentPath;
}
