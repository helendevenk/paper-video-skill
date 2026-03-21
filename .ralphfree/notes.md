# 生产经验库

> 跨视频积累的经验教训，新对话开始时读这个文件恢复上下文。

## 引擎选择经验

### Motion Canvas
- 没有 CLI 渲染命令，必须 Playwright headless + Vite dev server
- FFmpeg exporter 在 UI 下拉中不可选（只有 png/jpeg/webp），走图片序列 → FFmpeg 转换
- vite-plugin 是 CJS 模块，ESM 中用 `(mc as any).default ?? mc`
- 需要额外安装 `@motion-canvas/ui`（未列为 peerDependency）
- 默认端口 9000
- Code 组件的代码变形是杀手功能，效果很好
- LaTeX 用 KaTeX（非完整 LaTeX），常用公式够用

### Manim
- 需要 `brew install cairo` 才能安装 pycairo
- 用独立 venv 隔离（`.venv/`），不影响系统 Python
- `-ql` 是低质量快速渲染，正式用 `-qh`
- `-o` 参数只接受文件名不接受完整路径，需要从 media 目录拷贝输出
- 通过 `SCENE_DATA_PATH` 环境变量传入 scene data
- 3D 场景渲染较慢（spike 42s vs Remotion 13s），正式视频考虑渲染时间预算

### Remotion
- 逐场景渲染 + FFmpeg concat 避免长视频爆内存
- 本地 HTTP server 提供资源（Remotion bundle 无法访问文件系统）
- 中文字体 Noto Sans CJK 在 headless Chromium 正常渲染
- spring() 动画比 interpolate() 自然

## 管线经验

### 音频
- Edge-TTS 只提供 SentenceBoundary（非 WordBoundary）
- 中文按标点自然断句 + 整句淡入 + 进度高亮效果好
- MC/Manim 场景不内嵌音频，统一后期 FFmpeg mux

### 渲染
- 三引擎 pixel format 基本一致（yuv420p / yuvj420p），FFmpeg concat 兼容
- engine-router.mjs 做路由，render.mjs 不直接感知引擎差异
- Manim 失败有 graceful degradation（生成纯色帧 fallback）

### 脚本生成
- LLM 需要 few-shot examples 才能正确选择新 scene type
- `templates/paper_script.md` 包含所有 type 的 visual 格式说明
