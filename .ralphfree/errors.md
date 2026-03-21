# 错误模式库

> 记录每次渲染遇到的问题和解法，同类错误不重复踩坑。

## 依赖安装类

### E1: MC ffmpeg 包版本号
- **报错**: `No matching version found for @motion-canvas/ffmpeg@^1.2.0`
- **根因**: ffmpeg 包版本号跟 core 同步（3.17.x）
- **解法**: 所有 @motion-canvas/* 包用同一版本号

### E2: MC vite-plugin CJS/ESM 不兼容
- **报错**: `motionCanvas is not a function`
- **根因**: CJS default export 在 ESM 中被包装
- **解法**: `const plugin = (mc as any).default ?? mc`

### E3: MC 隐式依赖 @motion-canvas/ui
- **报错**: `Cannot find module '@motion-canvas/ui'`
- **解法**: 手动安装 `@motion-canvas/ui`

### E4: Manim pycairo 编译失败
- **报错**: `metadata-generation-failed × pycairo`
- **根因**: 缺少系统级 cairo 库
- **解法**: `brew install cairo pkg-config`

## 渲染类

（待积累）

## 音频类

（待积累）
