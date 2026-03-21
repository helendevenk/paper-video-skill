---
name: paper-video-plan
status: backlog
created: 2026-03-21T15:52:28Z
updated: 2026-03-21T15:53:00Z
---

# Paper-to-Video 开发计划

## 目标

构建一个独立的「论文/教程 → 解说视频」管线，输入一篇论文 PDF 或 Markdown，输出一个 5-10 分钟的横屏解说视频（16:9，1920x1080），包含语音旁白、动画字幕、代码演示、图表动画、公式推导等场景。

**POC 目标论文**：[MSA: Memory Sparse Attention](https://github.com/EverMind-AI/MSA) — 100M token 上下文的端到端稀疏注意力框架。

## 非目标

- 不做实时预览编辑器（用 Remotion Studio 即可）
- 不做 SaaS 部署（本地 CLI 管线）
- 不做 Talking Head / 数字人
- 不做多语言（先做中文解说）

## 架构概览

```
论文 PDF
    │
    ▼
┌─────────────────────────────┐
│  Stage 1: 论文解析           │
│  pdfplumber + LLM 摘要       │
│  输出：script.json            │
│  (分段脚本 + 视觉指令)        │
└─────────────┬───────────────┘
              │
         ┌────┴────┐
         ▼         ▼
┌──────────┐  ┌───────────────┐
│ Stage 2a │  │ Stage 2b      │
│ TTS 语音  │  │ 素材准备       │
│ audio-   │  │ • 论文图片下载  │
│ narrator │  │ • 代码片段提取  │
│          │  │ • Mermaid→PNG  │
│ 输出:     │  │               │
│ 每场景    │  │ 输出: assets/  │
│ mp3+时间戳│  │               │
└────┬─────┘  └──────┬────────┘
     │               │
     └───────┬───────┘
             ▼
┌─────────────────────────────┐
│  Stage 2c: 脚本充实          │
│  TTS 结果写回 script.json    │
│  每个 scene 加 audio 字段:   │
│  { file, duration, stamps }  │
│  输出：enriched_script.json   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Stage 3: Remotion 渲染      │
│  ⚡ 逐场景独立渲染            │
│  每个 scene → 独立 MP4 片段   │
│  最后 FFmpeg concat 拼接      │
│                              │
│  场景类型:                    │
│  • TitleScene    标题页       │
│  • BulletScene   要点列表     │
│  • CodeScene     代码演示     │
│  • FigureScene   论文图片/图表 │
│  • FormulaScene  公式推导     │
│  • CompareScene  对比表格     │
│  • SummaryScene  总结页       │
│                              │
│  输出: output.mp4 (1920x1080) │
└──────────────────────────────┘
```

### 关键架构决策（CTO 评审后确认）

1. **逐场景渲染 + FFmpeg 拼接**（非整体渲染）：避免 10 分钟视频爆内存，支持增量重渲单个场景
2. **每场景独立音频**：TTS 按场景生成 MP3，Remotion 按场景消费，FFmpeg 最终拼接
3. **enriched_script.json**：TTS 完成后将实际音频时长和时间戳写回脚本，Stage 3 读这个充实版
4. **DiagramScene 合并到 FigureScene**：Mermaid 预渲染为静态 PNG，用 FigureScene 显示（逐节点动画是兔子洞，POC 不做）
5. **KaTeX 直出 HTML**：不用 react-katex（5 年没更新），用 `katex.renderToString()` + `dangerouslySetInnerHTML`
6. **Shiki 静态高亮**：POC 不用 shiki-magic-move（WASM+SSR 兼容风险），用 Shiki 直出 HTML；WASM 失败 fallback 到 highlight.js

## 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| **视频框架** | Remotion 4.0.422 + React 19 | 锁定 claude-shorts 验证过的版本 |
| **TTS** | audio-narrator skill（Edge-TTS → OpenAI fallback） | 已有 skill、字级时间戳、免费 |
| **代码高亮** | Shiki（静态高亮，WASM 失败 fallback highlight.js） | VS Code 同引擎，POC 不用 magic-move |
| **公式渲染** | katex.renderToString() + dangerouslySetInnerHTML | react-katex 不兼容 React 19，直接用 KaTeX API |
| **图表** | Mermaid → 静态 PNG → FigureScene 显示 | mermaid-diagram skill 预渲染，不做 SVG 拆分动画 |
| **论文解析** | pdfplumber (Python) | 提取文本 + 图片 |
| **图片提取** | pdf2image (Python, 依赖 poppler-utils) | PDF 页面→图片 |
| **脚本生成** | Claude LLM | 结构化 JSON 输出 |
| **动画** | Remotion spring/interpolate | 已有经验、效果好 |
| **字幕** | @remotion/captions | 已有 claude-shorts 经验 |
| **场景拼接** | FFmpeg concat | 逐场景渲染后拼接，避免内存问题 |

## 项目结构

```
paper-video/
├── PLAN.md                    # 本文档
├── CLAUDE.md                  # 项目级指令
├── package.json               # Node.js 依赖
├── tsconfig.json
├── remotion.config.ts
│
├── scripts/                   # Python 管线脚本
│   ├── parse_paper.py         # Stage 1: PDF → 结构化数据
│   ├── generate_script.py     # Stage 1: LLM 脚本生成
│   ├── generate_audio.py      # Stage 2a: TTS 合成
│   ├── prepare_assets.py      # Stage 2b: 素材准备
│   └── render.mjs             # Stage 3: Remotion 渲染入口
│
├── src/                       # Remotion React 组件
│   ├── index.ts               # 入口
│   ├── Root.tsx               # Composition 定义
│   ├── PaperVideo.tsx         # 主视频组件
│   ├── types.ts               # 类型定义 + Zod schema
│   │
│   ├── scenes/                # 场景组件（7 个）
│   │   ├── TitleScene.tsx     # 标题页（论文名 + 作者 + 会议）
│   │   ├── BulletScene.tsx    # 要点列表（逐条动画进入）
│   │   ├── CodeScene.tsx      # 代码演示（Shiki 静态高亮 + 逐行揭示）
│   │   ├── FormulaScene.tsx   # 公式推导（KaTeX HTML + 逐步显示）
│   │   ├── FigureScene.tsx    # 论文图片/图表（缩放 + 标注，也用于 Mermaid PNG）
│   │   ├── CompareScene.tsx   # 对比表格（淡入，不做行列动画）
│   │   └── SummaryScene.tsx   # 总结页（关键数字 + 结论）
│   │
│   ├── components/            # 通用组件
│   │   ├── AnimatedCaption.tsx # 同步字幕
│   │   ├── ProgressBar.tsx    # 进度条
│   │   ├── Background.tsx     # 背景（渐变/网格/噪点）
│   │   └── Transition.tsx     # 场景转场
│   │
│   ├── hooks/                 # 自定义 hooks
│   │   ├── useSceneTimeline.ts # 场景时间轴计算
│   │   └── useAudioSync.ts    # 音频同步
│   │
│   └── styles/                # 样式常量
│       ├── colors.ts          # 配色方案
│       ├── fonts.ts           # 字体配置
│       └── animations.ts      # 动画预设
│
├── templates/                 # 脚本生成 prompt 模板
│   ├── paper_script.md        # 论文解说脚本 prompt
│   └── tutorial_script.md     # 教程解说脚本 prompt
│
├── input/                     # 输入文件
│   └── msa_paper.pdf
│
├── assets/                    # 生成的中间素材
│   ├── audio/
│   ├── figures/
│   └── diagrams/
│
└── output/                    # 最终视频
    └── msa_explained.mp4
```

## 数据流：structured_script.json 格式

这是整个管线的核心数据结构，连接 Stage 1 → Stage 2 → Stage 3：

```jsonc
{
  "meta": {
    "title": "MSA: Memory Sparse Attention",
    "authors": ["EverMind AI"],
    "duration_estimate_seconds": 420,
    "language": "zh-CN",
    "style": "tech_explainer"
  },
  "scenes": [
    {
      "id": "scene_01",
      "type": "title",                    // 场景类型
      "narration": "今天我们来解读一篇...", // TTS 文本
      "duration_hint": 8,                 // 建议时长（秒），实际由音频决定
      "transition": { "type": "fade", "duration": 0.5 }, // 转场效果
      "audio": null,                      // Stage 2c 充实后填入：
      // { "file": "assets/audio/scene_01.mp3", "duration_seconds": 8.2,
      //   "word_timestamps": [{ "word": "今天", "start_ms": 0, "end_ms": 320 }, ...] }
      "notes": "",                        // 人工审核备注
      "visual": {                         // 视觉指令
        "title": "Memory Sparse Attention",
        "subtitle": "100M Token 上下文的实用解法",
        "background": "gradient_dark"
      }
    },
    {
      "id": "scene_02",
      "type": "bullet",
      "narration": "这篇论文要解决的核心问题是...",
      "duration_hint": 15,
      "visual": {
        "heading": "核心问题",
        "points": [
          "Full Attention 的 O(n²) 复杂度",
          "现有方案在 1M token 后精度骤降",
          "RAG 管线复杂且不可微"
        ],
        "highlight_index": 0             // 当前高亮项（随旁白推进）
      }
    },
    {
      "id": "scene_03",
      "type": "figure",
      "narration": "从图一可以看到...",
      "duration_hint": 12,
      "visual": {
        "src": "assets/figures/fig1_scaling.png",
        "caption": "Figure 1: 16K→100M token 扩展曲线",
        "zoom_region": { "x": 0.3, "y": 0.2, "w": 0.5, "h": 0.6 },
        "annotations": [
          { "x": 0.7, "y": 0.3, "text": "MSA < 9% 衰减", "color": "#4CAF50" }
        ]
      }
    },
    {
      "id": "scene_04",
      "type": "diagram",
      "narration": "MSA 的整体架构分三个阶段...",
      "duration_hint": 20,
      "visual": {
        "mermaid": "graph TD\n  A[文档语料] --> B[离线编码]\n  B --> C[Chunk-Mean Pooling]\n  C --> D[压缩 KV Cache]\n  E[用户查询] --> F[在线路由]\n  F --> G[Top-k 选择]\n  D --> G\n  G --> H[稀疏生成]",
        "reveal_order": ["A", "B", "C", "D", "E", "F", "G", "H"]
      }
    },
    {
      "id": "scene_05",
      "type": "formula",
      "narration": "路由分数的计算方式是...",
      "duration_hint": 10,
      "visual": {
        "steps": [
          "S_{i} = \\max_{t} \\text{mean}_{h}(Q_r \\cdot K_{r,i}^T)",
          "\\text{Top-k}: \\{i \\mid S_i \\geq S_{(k)}\\}",
          "\\text{Context} = \\text{Concat}(\\bar{K}_{\\text{top-k}}, K_{\\text{local}})"
        ],
        "labels": ["路由分数", "Top-k 筛选", "上下文拼接"]
      }
    },
    {
      "id": "scene_06",
      "type": "compare",
      "narration": "和现有方案对比...",
      "duration_hint": 15,
      "visual": {
        "headers": ["方法", "平均分", "vs MSA"],
        "rows": [
          ["Standard RAG @best", "3.242", "-13.8%"],
          ["RAG + Rerank @best", "3.372", "-10.3%"],
          ["HippoRAG2 @best", "3.275", "-12.9%"],
          ["MSA (adaptive)", "3.760", "—"]
        ],
        "highlight_row": 3
      }
    },
    {
      "id": "scene_07",
      "type": "code",
      "narration": "核心代码实现其实很简洁...",
      "duration_hint": 15,
      "visual": {
        "language": "python",
        "code": "# Router scoring\nscores = torch.einsum('bhqd,bkd->bhqk', q_router, k_router)\nscores = scores.mean(dim=1).max(dim=1).values  # mean over heads, max over tokens\ntop_k_indices = scores.topk(k, dim=-1).indices\n\n# Sparse context assembly\nselected_kv = gather_kv(compressed_kv, top_k_indices)\ncontext = torch.cat([selected_kv, local_kv], dim=2)",
        "highlight_lines": [2, 3, 4],
        "reveal": "line_by_line"
      }
    },
    {
      "id": "scene_08",
      "type": "summary",
      "narration": "总结一下...",
      "duration_hint": 10,
      "visual": {
        "key_numbers": [
          { "value": "100M", "label": "最大上下文长度" },
          { "value": "<9%", "label": "精度衰减" },
          { "value": "2×A800", "label": "推理硬件" }
        ],
        "takeaway": "MSA 证明了：端到端可训练的稀疏记忆可以实用化地扩展到 1 亿 token"
      }
    }
  ]
}
```

## 开发阶段

### Phase 1: 项目骨架 + 最简管线（4-5 天）

**目标**：跑通 "硬编码脚本 → TTS → 逐场景 Remotion 渲染 → FFmpeg 拼接 → MP4" 的最小闭环

| 任务 | 内容 | 复杂度 |
|------|------|--------|
| 1.1 | 初始化 Remotion 项目，锁定 Remotion 4.0.422 + React 19 | 🟢 |
| 1.2 | **字体验证**：中文字体在 headless Chromium 渲染测试（Noto Sans CJK / PingFang）| 🟢 |
| 1.3 | 定义 `enriched_script.json` 的 Zod schema + TypeScript 类型 | 🟢 |
| 1.4 | 实现 `TitleScene` + `BulletScene` + `SummaryScene`（最基础的 3 个场景） | 🟡 |
| 1.5 | 实现 `SceneVideo.tsx`：单场景渲染组件（一个 scene → 一段 MP4） | 🟡 |
| 1.6 | 集成 `audio-narrator` skill：脚本文本 → 每场景 MP3 + 时间戳 | 🟢 |
| 1.7 | 实现 `enrich_script.py`：TTS 结果写回 JSON 生成 enriched_script.json | 🟢 |
| 1.8 | 实现 `AnimatedCaption` 字幕组件（复用 claude-shorts 经验） | 🟢 |
| 1.9 | `render.mjs`：逐场景渲染 + FFmpeg concat 拼接 | 🟡 |
| 1.10 | **预览验证**：确认 `npx remotion preview` 能预览单场景 | 🟢 |
| 1.11 | 手写 MSA 论文的简版脚本 JSON（3-4 个场景） | 🟢 |
| **验证** | 能产出一个有标题+要点+字幕+语音的 MP4 | |

### Phase 2: 丰富场景组件（4-5 天）

**目标**：补齐剩余 4 种场景类型 + 视觉打磨

| 任务 | 内容 | 复杂度 |
|------|------|--------|
| 2.1 | `FigureScene`：论文图片 + 缩放动画 + 标注叠加（也用于显示 Mermaid PNG）| 🟡 |
| 2.2 | `CodeScene`：Shiki 静态语法高亮 + 逐行揭示 + 行高亮（WASM 失败 fallback highlight.js）| 🟡 |
| 2.3 | `FormulaScene`：`katex.renderToString()` → HTML 注入 + 逐步显示 | 🟡 |
| 2.4 | `CompareScene`：styled HTML 表格 + 整体淡入 + 行高亮 | 🟢 |
| 2.5 | 场景转场效果（fade/slide，读 JSON 中 `transition` 字段） | 🟢 |
| 2.6 | 背景系统（暗色渐变 + 网格 + 噪点） | 🟢 |
| 2.7 | 进度条组件 | 🟢 |
| 2.8 | 素材资源服务策略：staticFile() 用于字体/背景，本地 HTTP 用于动态图片 | 🟢 |
| **验证** | MSA 完整 7 场景视频，视觉效果达到 YouTube 教程水准 | |

### Phase 3: 自动化脚本生成（2-3 天）

**目标**：从 PDF → 自动生成 structured_script.json

| 任务 | 内容 | 复杂度 |
|------|------|--------|
| 3.1 | `parse_paper.py`：PDF 文本 + 图片提取（pdfplumber + pdf2image） | 🟡 |
| 3.2 | `generate_script.py`：LLM 读论文 → 输出 structured_script.json | 🟡 |
| 3.3 | 脚本 prompt 模板（`templates/paper_script.md`） | 🟡 |
| 3.4 | `prepare_assets.py`：下载论文图片、生成 Mermaid SVG | 🟢 |
| 3.5 | 端到端 CLI：`python run.py input/paper.pdf -o output/` | 🟡 |
| **验证** | `python run.py input/msa_paper.pdf` 全自动产出视频 | |

### Phase 4: 打磨 + 模板化（POC 后再做）

> CTO 评审意见：Phase 4 整体延后，先确保 POC 跑通再打磨。

| 任务 | 内容 | 复杂度 |
|------|------|--------|
| 4.1 | 视觉风格系统：3 套配色主题（深色/浅色/学术） | 🟡 |
| 4.2 | 教程解说模板（区别于论文解说） | 🟢 |
| 4.3 | 封装为 Claude Code Skill（SKILL.md + 入口） | 🟢 |
| 4.4 | 错误恢复：TTS 失败重试、渲染失败回退 | 🟢 |
| 4.5 | Mermaid 逐节点动画（升级 FigureScene，解析 SVG DOM） | 🔴 |
| 4.6 | shiki-magic-move 代码动画过渡 | 🔴 |

## 依赖清单

### Node.js (Remotion 项目)

```json
{
  "remotion": "4.0.422",
  "@remotion/cli": "4.0.422",
  "@remotion/renderer": "4.0.422",
  "@remotion/bundler": "4.0.422",
  "@remotion/captions": "4.0.422",
  "@remotion/media-utils": "4.0.422",
  "@remotion/transitions": "4.0.422",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "zod": "^3.22.0",
  "shiki": "^1.0.0",
  "katex": "^0.16.0"
}
```

> 注意：所有 @remotion/* 包必须同版本。锁定 4.0.422 与 claude-shorts 一致。不用 react-katex（不兼容 React 19），不用 shiki-magic-move（POC 不需要）。

### Python (管线脚本)

```
pdfplumber>=0.10.0
pdf2image>=1.16.0
Pillow>=10.0.0
```

### 系统依赖

- Node.js 18+
- Python 3.10+
- FFmpeg (系统安装)
- Chrome/Chromium (Remotion 渲染需要)
- poppler-utils (`brew install poppler`，pdf2image 依赖)

## 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| Shiki WASM 在 Remotion bundle 中加载失败 | 代码场景无法渲染 | fallback: highlight.js（纯 JS，零配置） |
| 中文字体在 headless Chromium 不可用 | 出现豆腐块 | Phase 1.2 就验证字体，确保 Noto Sans CJK 可用 |
| TTS 音频质量不稳定 | 影响观看体验 | Edge-TTS → OpenAI TTS 自动降级 |
| 论文图片分辨率低 | 缩放后模糊 | 用 AI 超分（Real-ESRGAN）或重绘 |
| 脚本生成质量不稳定 | 生成内容不准确 | 人工审核 + 编辑 JSON 再渲染 |
| duration_hint vs 实际音频时长不匹配 | 视觉和音频不同步 | Stage 2c 用实际 TTS 时长覆盖 hint，Remotion 读实际值 |
| 10 分钟视频整体渲染爆内存 | 渲染失败 | 已改为逐场景渲染 + FFmpeg 拼接 |
| Python + Node.js 跨语言编排 | run.py 调 node 子进程容易出错 | 每个 stage 独立可运行、幂等，失败可重跑单阶段 |

## 成功标准

1. **POC**：输入 MSA 论文 PDF → 产出 5-8 分钟的解说视频
2. **视觉**：场景切换流畅、动画自然、字幕同步
3. **内容**：准确解释 MSA 的核心思想、架构、实验结果
4. **复用**：换一篇论文只需要重新跑管线，不改代码

## 参考项目

| 项目 | 参考点 |
|------|--------|
| [prajwal-y/video_explainer](https://github.com/prajwal-y/video_explainer) | Remotion + Claude + TTS 的完整管线架构 |
| [av/remotion-bits](https://github.com/av/remotion-bits) | CodeBlock 组件、文字动画、Motion 原语 |
| [remotion-dev/template-prompt-to-video](https://github.com/remotion-dev/template-prompt-to-video) | timeline.json 架构、AI 视频模板 |
| [wcandillon/remotion-fireship](https://github.com/wcandillon/remotion-fireship) | Fireship 风格代码教程视频美学 |
| [shikijs/shiki-magic-move](https://github.com/shikijs/shiki-magic-move) | 代码块动画过渡 React 组件 |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 官方 AI 生成 Remotion 代码的规则 |
| claude-shorts (本地) | Remotion 渲染、字幕、spring 动画经验 |

## CTO 评审记录

**评审日期**: 2026-03-21
**评审结论**: 架构方向正确，已采纳以下修改

### 已采纳的修改
1. ✅ R1: 改为逐场景渲染 + FFmpeg 拼接（原为整体渲染）
2. ✅ R2: 增加 Stage 2c "enriched script" 步骤，明确 TTS→渲染数据流
3. ✅ R3: 锁定 Remotion 4.0.422 + React 19（与 claude-shorts 一致）
4. ✅ R4: 弃用 react-katex，改用 katex.renderToString() 直出 HTML
5. ✅ R5: DiagramScene 合并到 FigureScene（Mermaid 预渲染 PNG）
6. ✅ R6: POC 不用 shiki-magic-move，Shiki 静态高亮 + highlight.js fallback
7. ✅ R7: Phase 1 增加预览验证步骤（1.10）和字体验证步骤（1.2）
8. ✅ R8: 系统依赖增加 poppler-utils
9. ✅ R9: Phase 1 增加字体策略验证

### 延后到 Phase 4+
- Mermaid 逐节点 SVG 动画
- shiki-magic-move 代码过渡动画
- 视觉风格系统 / 模板化 / Skill 封装
