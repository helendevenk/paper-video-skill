# 生产线状态

## 当前：空闲

## 历史视频

| # | 论文 | 输出 | 场景数 | 时长 | 日期 | 备注 |
|---|------|------|--------|------|------|------|
| 4 | MSA v2 (完整版) | msa_v2_triengine.mp4 | 12 | 335s | 2026-03-22 | v2 脚本 + 论文图片 + 中文语音，MC 场景暂 fallback Remotion |
| 3 | (三引擎测试) | tri_engine_test.mp4 | 4 | 65s | 2026-03-22 | Remotion + MC + Manim 全验证 |
| 2 | (E2E 测试) | e2e_mixed_test.mp4 | 4 | 86s | 2026-03-22 | Remotion + MC 混合验证 |
| 1 | MSA v1 | msa_v2.mp4 | 12 | 388s | 2026-03-22 | Phase 1 纯 Remotion，中文语音+字幕 |

## 管线版本

- **v1** (2026-03-22): 纯 Remotion，7 种 scene type
- **v2** (2026-03-22): 三引擎融合，13 种 scene type（+code_diff, formula_derive, algorithm, flowchart, arch_3d, math_3d）

## 基础设施状态

| 组件 | 版本 | 状态 |
|------|------|------|
| Remotion | 4.0.422 | ✅ |
| Motion Canvas | 3.17.x | ✅ |
| Manim | 0.20.1 (venv) | ✅ |
| Edge-TTS | 最新 | ✅ |
| FFmpeg | 系统安装 | ✅ |
| theme.json | v1 | ✅ |
