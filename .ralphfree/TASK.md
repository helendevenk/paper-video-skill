---
name: paper-video-pipeline
created: 2026-03-22T18:53:33Z
updated: 2026-03-22T20:30:00Z
mode: continuous-production
---

# Paper-Video 三引擎视频生产线

## 管线能力

```
PDF/Markdown → LLM 脚本 → TTS → 三引擎渲染 → FFmpeg concat → MP4
```

### 可用引擎 + scene type

| 引擎 | scene type | 擅长 |
|------|-----------|------|
| Remotion | title, bullet, figure, code, formula, compare, summary | 文字、列表、表格、图片、字幕同步 |
| Motion Canvas | code_diff, formula_derive, algorithm, flowchart | 代码变形、公式推导、算法步骤、流程图 |
| Manim | arch_3d, math_3d | 3D 网络架构、几何可视化 |

### 管线阶段

1. **脚本生成**：LLM 读论文 → `input/{name}_script.json`（参考 `templates/paper_script.md`）
2. **TTS 语音**：`python scripts/generate_audio.py` → 每场景 MP3 + 时间戳
3. **脚本充实**：TTS 结果写回 → `input/{name}_enriched.json`
4. **渲染**：`node scripts/render.mjs --script input/{name}_enriched.json --output output/{name}.mp4`
5. **验证**：`bash .ralphfree/verify.sh output/{name}.mp4`

### 关键约束

- 所有引擎输出 1920x1080 30fps H.264 yuv420p
- MC 渲染路径：Playwright headless → 图片序列 → FFmpeg 转 MP4
- Manim 渲染路径：venv Python → manim render → 复制到 fragments
- 音频统一后期 FFmpeg mux（MC/Manim 场景不内嵌音频）
- 字幕统一由 Remotion 处理或 FFmpeg 后期叠加

## 当前视频任务

> 每次开始新视频时更新这一节，完成后移到 STATUS.md 的历史记录

**当前**：无进行中的视频任务

模板：
```
论文：{论文名}
目标：{时长}分钟解说视频
状态：脚本生成 / TTS / 渲染 / 验证 / 完成
输出：output/{name}.mp4
```
