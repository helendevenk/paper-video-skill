---
name: paper-video
description: "USE THIS SKILL whenever user wants to create explanation videos from academic papers, or says 论文视频、paper video、论文解说、把论文做成视频。三引擎渲染（Remotion + Motion Canvas + Manim），输入论文 URL/PDF 自动生成 5-10 分钟解说视频，中文语音旁白 + 动画字幕。"
version: "3.0"
---

# Paper-Video — 论文解说视频生成器

> 论文 URL → 解说视频 MP4，全自动管线。

## 触发条件

用户说以下内容时启动：
- "帮我把这篇论文做成视频"
- "论文解说视频"
- "/paper-video"
- 发送 arxiv/论文 URL 并要求制作视频

## 快速开始

```
/paper-video https://arxiv.org/abs/2407.xxxxx
/paper-video input/paper.pdf
/paper-video https://arxiv.org/abs/2407.xxxxx https://arxiv.org/abs/2408.yyyyy  # 批量
```

## 管线架构

```
论文 URL/PDF
     │
     ├─ 1. 获取论文 ──→ input/{name}.pdf
     │
     ├─ 2. 解析+脚本 ──→ input/{name}_script.json
     │     (LLM 读论文 → 选择 scene type → 生成结构化脚本)
     │
     ├─ 3. TTS 语音 ──→ assets/audio/{scene_id}.mp3
     │     (Edge-TTS 中文语音 + 词级时间戳)
     │
     ├─ 4. 脚本充实 ──→ input/{name}_enriched.json
     │     (TTS 时长/时间戳写回脚本)
     │
     ├─ 5. 三引擎渲染 ──→ output/.fragments/scene_XX.mp4
     │     (engine-router 按 type 分发到 Remotion/MC/Manim)
     │
     ├─ 6. FFmpeg 拼接 ──→ output/{name}.mp4
     │
     └─ 7. 质量验证 ──→ verify.sh 检查格式/时长/大小
```

## 工作流程（Claude 执行步骤）

### Step 0: 读取状态

```bash
# 必须先读这些文件恢复上下文
cat .ralphfree/TASK.md     # 管线能力 + 当前任务
cat .ralphfree/notes.md    # 经验库（引擎选择、已知坑）
cat .ralphfree/errors.md   # 错误模式（避免重复踩坑）
```

### Step 1: 获取论文

- arxiv URL → 用 WebFetch/firecrawl 下载 PDF 到 `input/`
- 本地 PDF → 直接使用
- 多篇论文 → 逐篇处理，每篇独立管线

### Step 2: 生成脚本

读取 `templates/paper_script.md` 了解所有可用 scene type，然后：

1. 解析论文（pdfplumber 或 LLM 直接读 PDF）
2. 生成 `input/{name}_script.json`，为每个段落选择最合适的 scene type：
   - 概述/要点 → `bullet`（Remotion，逐条高亮）
   - 公式推导 → `formula`（Remotion KaTeX 渲染，步骤编号 + 逐步高亮）
   - 代码展示 → `code`（Remotion highlight.js 语法高亮，逐行揭示）
   - 图片展示 → `figure`（Remotion，标注标签 + zoom 动画）
   - 对比表格 → `compare`（Remotion，逐行动画 + 当前行高亮）
   - 代码变形 → `code_diff`（Motion Canvas，v1→v2 平滑过渡）
   - 动态流程图 → `flowchart`（Motion Canvas，节点逐步出现）
   - 3D 结构 → `arch_3d`（Manim）

   **选择原则**：优先用 Remotion 场景（渲染快 ~14s/场景），MC 场景渲染慢（冷启动 >60s），只在需要代码变形/动态流程图等 Remotion 做不到的效果时才用。

### Step 3-4: TTS + 充实

```bash
python scripts/generate_audio.py input/{name}_script.json
```

### Step 5-6: 渲染

```bash
node scripts/render.mjs --script input/{name}_enriched.json --output output/{name}.mp4
```

### Step 7: 验证

```bash
bash .ralphfree/verify.sh output/{name}.mp4
```

### Step 8: 更新状态

- 成功 → 更新 `.ralphfree/STATUS.md` 历史记录
- 失败 → 记录到 `.ralphfree/errors.md`，分析原因，重试或换方案
- 新发现 → 追加到 `.ralphfree/notes.md`

## 三引擎 Scene Type 速查

| Type | 引擎 | 用途 | 视觉效果 |
|------|------|------|---------|
| `title` | Remotion | 标题页 | 粒子漂浮 + 渐变光线 + 文字发光入场 |
| `bullet` | Remotion | 要点列表 | 逐条淡入 + 当前行高亮/发光 + 已讲完变灰 |
| `figure` | Remotion | 图片展示 | 标注标签 + zoom 放大缩回 + 扫描聚光灯 |
| `code` | Remotion | 代码展示 | highlight.js 语法高亮 + macOS 窗口 + 逐行揭示 + 当前行高亮 |
| `formula` | Remotion | 公式推导 | KaTeX LaTeX 渲染 + 步骤编号 + 逐步高亮 + 标签 |
| `compare` | Remotion | 对比表格 | 逐行淡入 + 当前行左侧彩色边框 + 高亮行 |
| `summary` | Remotion | 总结页 | 关键数字弹性入场 + 金色高亮 |
| `code_diff` | MC | 代码变形 | v1→v2 平滑 morphing 动画 |
| `formula_derive` | MC/Remotion | 公式推导 | 同 formula（MC 冷启动慢时 fallback 到 Remotion） |
| `algorithm` | MC | 算法步骤 | 伪代码逐行高亮执行 |
| `flowchart` | MC | 动态流程图 | 节点 + 箭头逐步出现 |
| `arch_3d` | Manim | 3D 架构 | 3D 棱柱层 + 旋转摄像机 + 连线动画 |
| `math_3d` | Manim | 3D 数学 | 3D 曲面/向量场可视化 |

### 所有场景共享的视觉增强

- **动态背景**：流动渐变光斑 + 网格纹理 + 暗角 + 顶部光线，每种场景类型不同色调
- **场景转场**：淡入淡出过渡（12 帧）
- **进度条**：底部渐变彩色条 + 右上角场景计数
- **字幕**：底部居中半透明条 + 逐字高亮进度 + 大字体

## 状态管理（内化 RalphFree）

`.ralphfree/` 是管线的持久化记忆，每次对话必须读取：

| 文件 | 作用 | 规则 |
|------|------|------|
| `TASK.md` | 管线能力 + 当前任务 | 开始新视频时更新"当前视频任务"节 |
| `STATUS.md` | 历史记录 + 基础设施 | 视频完成后追加一行 |
| `notes.md` | 经验库 | 发现新经验时追加，不删旧的 |
| `errors.md` | 错误模式 | 新错误立刻记录，含报错+根因+解法 |
| `verify.sh` | 质量验证 | 每个视频渲染后跑一次 |

### 三条硬规则（继承自 RalphFree Manus Pattern）

1. **Read-Before-Act**：每次对话开始先读 `.ralphfree/` 四个文件
2. **Fail-Fast-Record**：渲染失败立刻写 `errors.md`，同类错误最多重试 2 次
3. **Learn-And-Accumulate**：完成后更新 `notes.md` 和 `STATUS.md`

## 关键文件

```
paper-video/
├── SKILL.md                       ← 本文件
├── theme.json                     ← 跨引擎共享主题
├── .ralphfree/                    ← 持久化记忆
│   ├── TASK.md, STATUS.md, notes.md, errors.md, verify.sh
│
├── scripts/
│   ├── render.mjs                 ← 三引擎渲染入口
│   ├── engine-router.mjs          ← 引擎路由
│   └── generate_audio.py          ← TTS 语音生成
│
├── src/                           ← Remotion 场景组件 (7个)
│   ├── scenes/
│   │   ├── TitleScene.tsx         ← 粒子 + 发光入场
│   │   ├── BulletScene.tsx        ← 逐条高亮
│   │   ├── FigureScene.tsx        ← 标注 + zoom
│   │   ├── CodeScene.tsx          ← highlight.js 语法高亮
│   │   ├── FormulaScene.tsx       ← KaTeX LaTeX 渲染
│   │   ├── CompareScene.tsx       ← 逐行动画
│   │   └── SummaryScene.tsx       ← 关键数字弹入
│   ├── components/
│   │   ├── Background.tsx         ← 动态背景（流动光斑 + 网格）
│   │   ├── AnimatedCaption.tsx    ← 逐字高亮字幕
│   │   └── ProgressBar.tsx        ← 渐变进度条 + 场景计数
├── motion-canvas-scenes/          ← MC 场景
│   ├── src/scenes/*.tsx
│   └── scripts/render-mc.mjs
├── manim-scenes/                  ← Manim 场景
│   ├── scenes/*.py
│   └── .venv/
│
├── templates/
│   └── paper_script.md            ← LLM 脚本生成 prompt
├── input/                         ← 输入论文 + 脚本 JSON
└── output/                        ← 输出视频
```

## 输出规范

- 分辨率：1920x1080
- 帧率：30fps
- 编码：H.264 yuv420p
- 语音：中文（zh-CN-YunxiNeural）
- 字幕：逐句同步
- 时长：5-10 分钟（取决于论文长度）
