---
name: paper-video
description: "论文解说视频生成器。输入论文 URL/PDF，自动生成 5-10 分钟的解说视频。三引擎渲染（Remotion + Motion Canvas + Manim），中文语音旁白 + 动画字幕。USE THIS SKILL whenever user wants to create explanation videos from academic papers, or says 论文视频、paper video、论文解说。"
version: "2.0"
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
   - 概述/要点 → `bullet`
   - 代码演进 → `code_diff`（Motion Canvas）
   - 公式推导 → `formula_derive`（Motion Canvas）
   - 算法步骤 → `algorithm`（Motion Canvas）
   - 架构流程 → `flowchart`（Motion Canvas）
   - 3D 结构 → `arch_3d`（Manim）
   - 图片展示 → `figure`
   - 对比表格 → `compare`

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

| Type | 引擎 | 用途 | Visual 字段 |
|------|------|------|------------|
| `title` | Remotion | 标题页 | title, subtitle, authors |
| `bullet` | Remotion | 要点列表 | heading, points |
| `figure` | Remotion | 图片展示 | src, caption, zoomRegion |
| `code` | Remotion | 静态代码 | language, code, highlightLines |
| `formula` | Remotion | 单公式展示 | steps, labels |
| `compare` | Remotion | 对比表格 | headers, rows, highlightRow |
| `summary` | Remotion | 总结页 | keyNumbers, takeaway |
| `code_diff` | MC | 代码变形 | codeV1, codeV2, language |
| `formula_derive` | MC | 公式推导 | steps[{latex,label}], direction |
| `algorithm` | MC | 算法步骤 | title, pseudocode, highlightSteps |
| `flowchart` | MC | 动态流程图 | nodes, edges, revealOrder |
| `arch_3d` | Manim | 3D 架构 | layers, connections, cameraAngle |
| `math_3d` | Manim | 3D 数学 | (待定) |

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
├── src/                           ← Remotion 场景组件
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
