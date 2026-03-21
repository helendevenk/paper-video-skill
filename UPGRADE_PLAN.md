---
name: tri-engine-upgrade-plan
status: backlog
created: 2026-03-22T17:05:05Z
updated: 2026-03-21T18:28:07Z
---

# Paper-Video 三引擎融合升级方案

## 背景

当前 paper-video 管线（Phase 1 已验证）使用纯 Remotion 渲染所有场景类型。Remotion 的帧驱动渲染模型在以下场景表达力不足：

| 痛点 | 现状 | 影响 |
|------|------|------|
| 代码 diff 动画 | Shiki 静态高亮 + 逐行揭示 | 无法展示代码变化过程（v1 → v2 平滑变形） |
| 公式推导 | KaTeX 一次性渲染 + 分步显示 | 无法做公式展开/化简的连续变换 |
| 算法流程编排 | 手算帧偏移 + 嵌套 Sequence | 复杂编排代码量大、难维护 |
| 3D 可视化 | @remotion/three 可用但重 | 神经网络架构图、几何可视化不直观 |

## 升级目标

引入 Motion Canvas 和 Manim 作为补充渲染引擎，在管线层（FFmpeg concat）融合，每个引擎只做最擅长的场景类型。

**不改变现有架构**，仅在 render.mjs 的渲染循环中加引擎路由层。

## 架构设计

### 现有架构（不动）

```
PDF → LLM script.json → TTS → enriched_script.json → Remotion 渲染 → FFmpeg concat → MP4
```

### 升级后架构

```
PDF → LLM script.json → TTS → enriched_script.json
                                       │
                              Scene Router (render.mjs)
                         ┌─────────┼─────────┐
                         ▼         ▼         ▼
                    Remotion   MotionCanvas  Manim
                    ────────   ───────────   ─────
                    title      code_diff    arch_3d
                    bullet     formula_derive  math_3d
                    figure     algorithm
                    compare    flowchart
                    summary
                         │         │         │
                         ▼         ▼         ▼
                    scene_XX.mp4 (统一 1920x1080 30fps H.264)
                         │         │         │
                         └─────────┼─────────┘
                                   ▼
                            FFmpeg concat
                                   │
                                   ▼
                              final.mp4
```

### 引擎路由规则

| scene.type（现有） | 渲染引擎 | 说明 |
|---------------------|----------|------|
| `title` | Remotion | 不变 |
| `bullet` | Remotion | 不变 |
| `figure` | Remotion | 不变 |
| `compare` | Remotion | 不变 |
| `summary` | Remotion | 不变 |
| `code` | Remotion | 现有 Shiki 静态高亮，不变 |
| `formula` | Remotion | 现有 KaTeX 分步，不变 |
| `code_diff`（新增） | Motion Canvas | 代码 v1→v2 平滑变形 |
| `formula_derive`（新增） | Motion Canvas | 公式连续推导动画 |
| `algorithm`（新增） | Motion Canvas | 算法步骤 + 流程图编排 |
| `flowchart`（新增） | Motion Canvas | 动态流程图（节点逐步出现 + 箭头连线） |
| `arch_3d`（新增） | Manim | 3D 神经网络架构图 |
| `math_3d`（新增） | Manim | 3D 数学/几何可视化 |

**关键约束**：现有 7 种 scene type 的渲染逻辑完全不变。新增 scene type 才走新引擎。LLM 生成脚本时根据内容选择最合适的 type。

### 统一约束（跨引擎一致性）

```jsonc
// theme.json — 三个引擎共享
{
  "canvas": { "width": 1920, "height": 1080, "fps": 30 },
  "colors": {
    "background": "#0f172a",
    "surface": "#1e293b",
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    "accent": "#10b981",
    "text": "#f1f5f9",
    "textMuted": "#94a3b8",
    "highlight": "#fbbf24",
    "error": "#ef4444"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter",
    "code": "JetBrains Mono",
    "cjk": "Noto Sans CJK SC"
  },
  "spacing": {
    "margin": 80,
    "padding": 40,
    "lineHeight": 1.6
  },
  "animation": {
    "easing": "easeInOutCubic",
    "durationPresets": {
      "fast": 0.3,
      "normal": 0.6,
      "slow": 1.2
    },
    "fadeIn": 0.4,
    "fadeOut": 0.3
  }
}
```

字幕统一由最终 FFmpeg 叠加（或 Remotion 包装层添加），Motion Canvas / Manim 场景不内嵌字幕。

## 实现计划

### Phase 2A: Motion Canvas 集成（核心，3-4 天）

**目标**：在现有管线中加入 Motion Canvas 渲染路径，验证 code_diff 场景

| 步骤 | 任务 | 复杂度 | 产出 |
|------|------|--------|------|
| 2A.1 | 创建 `motion-canvas-scenes/` 子目录，初始化 Motion Canvas 项目 | 🟢 | package.json, vite.config.ts |
| 2A.2 | 实现 theme loader：读取 theme.json 应用到 Motion Canvas | 🟢 | theme.ts |
| 2A.3 | 实现 `CodeDiffScene`：接收 codeV1/codeV2/language，渲染代码变形动画 | 🟡 | code-diff.tsx |
| 2A.4 | 实现 MC 渲染脚本：读 scene JSON → 生成 MC 项目 → 渲染 MP4 | 🟡 | render-mc.mjs |
| 2A.5 | render.mjs 加路由层：scene.type 匹配新类型时调用 MC 渲染 | 🟢 | render.mjs 修改 |
| 2A.6 | 音频同步：MC 场景通过 generator yield 对齐 TTS 时间戳 | 🟡 | audio-sync 逻辑 |
| 2A.7 | E2E 验证：在 MSA 论文脚本中加一个 code_diff 场景，验证混合渲染 | 🟢 | 测试视频 |
| **验证** | 一个视频中同时有 Remotion 和 MC 渲染的场景，转场自然 | | |

**2A.3 CodeDiffScene 核心实现**：

```typescript
// motion-canvas-scenes/src/scenes/code-diff.tsx
import { Code, makeScene2D } from '@motion-canvas/2d'
import { createRef, waitFor } from '@motion-canvas/core'

export default makeScene2D(function* (view) {
  const code = createRef<Code>()

  // 从 scene JSON 读取数据（通过环境变量或临时文件传入）
  const { codeV1, codeV2, language } = sceneData

  view.add(
    <Code
      ref={code}
      code={codeV1}
      language={language}
      fontSize={28}
      fontFamily="JetBrains Mono"
    />
  )

  yield* waitFor(1)                    // 停顿让观众看 v1
  yield* code().code(codeV2, 1.5)      // 平滑变形到 v2
  yield* waitFor(1)                    // 停顿看结果
})
```

**2A.4 MC 渲染调用**：

```javascript
// render.mjs 中新增
async function renderWithMotionCanvas(scene, index, tmpDir) {
  const sceneDataPath = path.join(tmpDir, `mc_data_${index}.json`)
  fs.writeFileSync(sceneDataPath, JSON.stringify(scene))

  const fragmentPath = path.join(tmpDir, `scene_${String(index + 1).padStart(2, '0')}.mp4`)

  // Motion Canvas CLI 渲染
  execSync(
    `cd motion-canvas-scenes && npx motion-canvas render ` +
    `--scene ${scene.type} ` +
    `--data "${sceneDataPath}" ` +
    `--output "${fragmentPath}" ` +
    `--width 1920 --height 1080 --fps 30`,
    { stdio: 'pipe' }
  )

  return fragmentPath
}
```

### Phase 2B: Motion Canvas 场景扩充（2-3 天）

| 步骤 | 任务 | 复杂度 |
|------|------|--------|
| 2B.1 | `FormulaDeriveScene`：LaTeX 公式连续推导（KaTeX 分段 → 逐步 reveal） | 🟡 |
| 2B.2 | `AlgorithmScene`：算法伪代码 + 步骤高亮 + 数据结构可视化 | 🟡 |
| 2B.3 | `FlowchartScene`：动态流程图（节点 + 箭头逐步出现） | 🟡 |
| 2B.4 | 更新 LLM prompt 模板，让脚本生成器能产出新 scene type | 🟢 |

### Phase 2C: Manim 集成（按需，2-3 天）

**触发条件**：遇到需要 3D 可视化的论文时再做。

| 步骤 | 任务 | 复杂度 |
|------|------|--------|
| 2C.1 | 创建 `manim-scenes/` 子目录，安装 Manim Community | 🟢 |
| 2C.2 | 实现 theme loader：读 theme.json 映射到 Manim 配色 | 🟢 |
| 2C.3 | `Arch3DScene`：3D 神经网络层可视化 | 🔴 |
| 2C.4 | render.mjs 加 Manim 调用路径 | 🟢 |
| 2C.5 | 音频：Manim 渲染后 FFmpeg mux 音频轨 | 🟢 |

**Manim 调用方式**：

```javascript
async function renderWithManim(scene, index, tmpDir) {
  const sceneDataPath = path.join(tmpDir, `manim_data_${index}.json`)
  fs.writeFileSync(sceneDataPath, JSON.stringify(scene))

  const fragmentPath = path.join(tmpDir, `scene_${String(index + 1).padStart(2, '0')}.mp4`)

  execSync(
    `cd manim-scenes && python -m manim render ` +
    `-ql --fps 30 -r 1920,1080 ` +
    `--scene_data "${sceneDataPath}" ` +
    `scenes/${scene.type}.py ${scene.type}Scene ` +
    `-o "${fragmentPath}"`,
    { stdio: 'pipe' }
  )

  // Mux audio if exists
  if (scene.audio?.file) {
    const withAudio = fragmentPath.replace('.mp4', '_audio.mp4')
    execSync(
      `ffmpeg -y -i "${fragmentPath}" -i "${scene.audio.file}" ` +
      `-c:v copy -c:a aac -shortest "${withAudio}"`,
      { stdio: 'pipe' }
    )
    fs.renameSync(withAudio, fragmentPath)
  }

  return fragmentPath
}
```

## 数据结构变更

### types.ts 新增 scene type

```typescript
// 新增到 SceneSchema.type enum
type: z.enum([
  // 现有（Remotion）
  "title", "bullet", "figure", "code", "formula", "compare", "summary",
  // 新增（Motion Canvas）
  "code_diff", "formula_derive", "algorithm", "flowchart",
  // 新增（Manim）
  "arch_3d", "math_3d",
]),
```

### 新增 Visual Schema

```typescript
export const CodeDiffVisualSchema = z.object({
  language: z.string().default("python"),
  codeV1: z.string(),
  codeV2: z.string(),
  description: z.string().default(""),       // 变更说明
  highlightChanges: z.boolean().default(true),
})

export const FormulaDeriveVisualSchema = z.object({
  steps: z.array(z.object({
    latex: z.string(),
    label: z.string().default(""),
    highlight: z.string().optional(),        // 高亮子表达式
  })),
  direction: z.enum(["forward", "simplify"]).default("forward"),
})

export const AlgorithmVisualSchema = z.object({
  title: z.string(),
  pseudocode: z.string(),
  highlightSteps: z.array(z.number()).default([]),
  dataStructure: z.record(z.unknown()).optional(),  // 可视化数据结构
})

export const FlowchartVisualSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(["process", "decision", "io", "start_end"]).default("process"),
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string().default(""),
  })),
  revealOrder: z.array(z.string()).default([]),  // 节点出现顺序
})

export const Arch3DVisualSchema = z.object({
  layers: z.array(z.object({
    name: z.string(),
    type: z.enum(["dense", "conv", "attention", "norm", "custom"]),
    size: z.array(z.number()),               // [width, height, depth]
    color: z.string().optional(),
  })),
  connections: z.enum(["sequential", "skip", "custom"]).default("sequential"),
  cameraAngle: z.object({
    phi: z.number().default(75),
    theta: z.number().default(-45),
  }).default({}),
})
```

## render.mjs 路由层改动

```javascript
// 新增路由函数
function getRenderer(sceneType) {
  const mcTypes = ['code_diff', 'formula_derive', 'algorithm', 'flowchart']
  const manimTypes = ['arch_3d', 'math_3d']

  if (mcTypes.includes(sceneType)) return 'motion-canvas'
  if (manimTypes.includes(sceneType)) return 'manim'
  return 'remotion'  // 默认
}

// 修改渲染循环
for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i]
  const renderer = getRenderer(scene.type)

  let fragmentPath
  switch (renderer) {
    case 'motion-canvas':
      fragmentPath = await renderWithMotionCanvas(scene, i, tmpDir)
      break
    case 'manim':
      fragmentPath = await renderWithManim(scene, i, tmpDir)
      break
    default:
      fragmentPath = await renderWithRemotion(scene, i, tmpDir, serveUrl, browser)
      break
  }

  fragmentPaths.push(fragmentPath)
}
```

现有的 Remotion 渲染逻辑抽取为 `renderWithRemotion()` 函数，代码不变，只是包装一层。

## 项目结构变更

```
paper-video/
├── PLAN.md                        # 不变
├── UPGRADE_PLAN.md                # 本文档
├── theme.json                     # 新增：跨引擎共享主题
│
├── src/                           # Remotion 项目（不变）
│   └── ...
│
├── motion-canvas-scenes/          # 新增：MC 渲染项目
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── theme.ts               # 读 theme.json
│   │   ├── scenes/
│   │   │   ├── code-diff.tsx
│   │   │   ├── formula-derive.tsx
│   │   │   ├── algorithm.tsx
│   │   │   └── flowchart.tsx
│   │   └── utils/
│   │       └── audio-sync.ts      # TTS 时间戳同步
│   └── tsconfig.json
│
├── manim-scenes/                  # 新增：Manim 渲染项目（Phase 2C）
│   ├── requirements.txt
│   ├── theme.py                   # 读 theme.json
│   └── scenes/
│       ├── arch_3d.py
│       └── math_3d.py
│
├── scripts/
│   ├── render.mjs                 # 修改：加路由层
│   ├── render-mc.mjs              # 新增：MC 渲染入口
│   └── generate_audio.py          # 不变
│
└── templates/
    └── paper_script.md            # 修改：加新 scene type 说明
```

## 风险评估

| 风险 | 严重程度 | 缓解策略 |
|------|----------|----------|
| Motion Canvas 项目低活跃（单维护者） | 🟡 中 | MIT 开源可 fork；核心功能已稳定；Code 组件是我们主用功能不太会被破坏 |
| MC CLI 渲染可能需要浏览器 | 🟡 中 | Motion Canvas 内建 FFmpeg exporter 可直接输出视频，不依赖 GUI |
| 三引擎输出视觉风格不一致 | 🟡 中 | theme.json 统一配色/字体；先验证再扩展 |
| MC 场景音频同步精度 | 🟢 低 | generator yield + waitFor() 精度足够；长场景可分段 |
| Manim Python 版本/依赖冲突 | 🟢 低 | manim-scenes/ 用独立 venv |
| render.mjs 复杂度增加 | 🟢 低 | 路由层代码量 < 30 行；每个引擎渲染函数独立 |

## 成功标准

1. **Phase 2A 验收**：一个视频中包含 Remotion bullet 场景 + Motion Canvas code_diff 场景，播放连贯、风格一致
2. **Phase 2B 验收**：formula_derive + algorithm 场景可用，LLM 能正确生成新 scene type
3. **Phase 2C 验收**：3D 架构图场景渲染正确，与前后场景无缝衔接

## 与 PLAN.md 的关系

本文档是 PLAN.md Phase 2 的扩展升级方案：

- PLAN.md Phase 2（丰富 Remotion 场景组件）→ 保持不变，继续完善现有 7 种场景
- 本文档 Phase 2A/2B/2C → 新增场景类型，用更合适的引擎渲染
- PLAN.md Phase 3（自动化脚本生成）→ 需同步更新 LLM prompt，识别新 scene type
- PLAN.md Phase 4（打磨 + 模板化）→ theme.json 可提前到 2A.2 实现

## CTO 评审记录

**评审日期**: 2026-03-22
**评审结论**: 有条件通过（6 条建议，采纳 5 条，驳回 1 条）

### 已采纳的修改

1. ✅ R2: scene type 路由从 render.mjs 抽成独立模块 `scripts/engine-router.mjs`，render.mjs import 使用
2. ✅ R3: theme.json 增加 animation 参数层（easing、durationPresets、fadeIn/fadeOut），三引擎映射统一
3. ✅ R4: types.ts 的 SceneSchema 改用 z.discriminatedUnion，visual 按 type 严格校验
4. ✅ R5: MC/Manim 场景音频统一后期 FFmpeg mux，不在各引擎内部处理音频同步
5. ✅ R6: 验证标准具体化 — 截图对比背景色/字体/内边距 + ffprobe 验证无黑帧/音频连续 + pixel format 一致(yuv420p)

### 驳回

1. ❌ R1（移除 Manim）: 用户明确要求保留 3D 能力。Manim 从"按需"改为 Phase 2C 确定实施，但做以下缓解：
   - Manim 场景用独立 Python venv，不影响主管线依赖
   - render.mjs 调用 Manim 通过子进程隔离，失败不影响其他场景渲染（graceful degradation）
   - 先只实现 `arch_3d` 一个 scene type，验证跨语言编排可靠性后再扩展 `math_3d`

### 新增步骤

1. ✅ 新增 Phase 2A.0: Motion Canvas 技术 spike（0.5 天）— 验证 headless 渲染、CLI 参数传入、输出格式可控性
2. ✅ 新增 Phase 2C.0: Manim 技术 spike（0.5 天）— 验证 venv 隔离 + 子进程调用 + 输出 H.264/yuv420p

### 修改后的实施节奏

```
Phase 2A (3-4天) — Motion Canvas 集成:
  2A.0  MC 技术 spike — headless 渲染验证 (0.5天)
  2A.1  MC 项目初始化 + theme loader (0.5天)
  2A.2  CodeDiffScene 实现 (1天)
  2A.3  engine-router.mjs + render.mjs 集成 + 统一音频 mux (1天)
  2A.4  E2E 验证 (0.5天)

Phase 2B (2-3天) — MC 场景扩充:
  FormulaDeriveScene / AlgorithmScene / FlowchartScene + LLM prompt 更新

Phase 2C (2-3天) — Manim 集成:
  2C.0  Manim 技术 spike — venv + 子进程验证 (0.5天)
  2C.1  manim-scenes/ 初始化 + theme loader (0.5天)
  2C.2  Arch3DScene 实现 (1天)
  2C.3  render.mjs Manim 路径 + graceful degradation (0.5天)
  2C.4  E2E 验证 (0.5天)
```

### 风险缓解（最终版）

| 风险 | 等级 | 缓解 |
|------|------|------|
| MC CLI 渲染方式不明确 | 🟡 中 | 2A.0 spike 验证 MC 内建 FFmpeg exporter API 直接输出 MP4 |
| MC 版本与 Node/Vite 冲突 | 🟡 中 | motion-canvas-scenes/ 独立 package.json |
| 三引擎 pixel format 不一致 | 🟡 中 | 每个引擎渲染后 ffprobe 检查，不一致则 ffmpeg 转码 |
| Manim Python 依赖冲突 | 🟡 中 | 独立 venv，requirements.txt 锁版本 |
| Manim 子进程调用失败 | 🟡 中 | graceful degradation — 失败则 fallback 到 Remotion 静态图 |
| LLM 生成新 scene type 质量 | 🟡 中 | prompt 加 few-shot examples + JSON schema 校验 |
| MC 单维护者项目风险 | 🟢 低 | 锁版本 + MIT 可 fork + 只用 Code/LaTeX/Layout 核心组件 |

## 实施完成记录

**完成日期**: 2026-03-22

### Phase 2A ✅ Motion Canvas 集成
- MC 渲染方式：Playwright headless → 图片序列 → FFmpeg 转 MP4（MC 内建 FFmpeg exporter 不可选）
- spike 验证通过：1920x1080 30fps h264 yuv420p
- E2E 混合渲染验证通过（Remotion + MC 场景在同一视频中）

### Phase 2B ✅ MC 场景扩充
- FormulaDeriveScene：LaTeX 公式逐步推导动画
- AlgorithmScene：伪代码逐行高亮执行
- FlowchartScene：动态流程图节点+箭头逐步出现
- types.ts 更新：6 个新 scene type + 5 个 Visual Schema
- LLM prompt 模板创建：templates/paper_script.md

### Phase 2C ✅ Manim 3D 集成
- Manim 0.20.1 安装在独立 venv（需要 brew install cairo）
- Arch3DScene：3D 神经网络层可视化（Prism + 旋转摄像机）
- theme.py 读取 theme.json 保持视觉一致
- engine-router.mjs 支持 venv Python + SCENE_DATA_PATH 环境变量传参
- graceful degradation：Manim 失败 → 生成纯色帧 fallback

### 三引擎 E2E 验证 ✅
```
Remotion(title) → Motion Canvas(code_diff) → Manim(arch_3d) → Remotion(summary)
Output: tri_engine_test.mp4 | 4.5MB | 65s | 1920x1080 | 30fps | h264 | yuv420p
```
