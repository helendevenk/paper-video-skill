import { makeScene2D, Code, Rect, Txt } from '@motion-canvas/2d';
import { createRef, waitFor, all } from '@motion-canvas/core';
import { colors, fonts, spacing, animation } from '../theme';

/**
 * CodeDiffScene — 代码 v1 → v2 平滑变形动画
 *
 * MC 的 Code 组件核心功能：自动 diff 两段代码，
 * 新增行渐入、删除行渐出、修改行平滑过渡。
 *
 * Scene data 通过 MC meta 或环境变量传入。
 */
export default makeScene2D(function* (view) {
  const bg = createRef<Rect>();
  const title = createRef<Txt>();
  const code = createRef<Code>();

  // Background
  view.add(
    <Rect
      ref={bg}
      width={1920}
      height={1080}
      fill={colors.background}
    />
  );

  // Title (optional)
  view.add(
    <Txt
      ref={title}
      text="Code Evolution"
      fontSize={36}
      fontFamily={fonts.heading}
      fill={colors.textMuted}
      y={-440}
      opacity={0}
    />
  );

  // Code block — v1
  const codeV1 = `def forward(self, x):
    return self.linear(x)`;

  const codeV2 = `def forward(self, x):
    x = self.norm(x)
    x = self.dropout(x)
    return self.linear(x)`;

  view.add(
    <Code
      ref={code}
      code={codeV1}
      fontSize={32}
      fontFamily={fonts.code}
      lineHeight={48}
      opacity={0}
    />
  );

  // Animation sequence
  // 1. Fade in title
  yield* title().opacity(1, animation.durationPresets.normal);
  yield* waitFor(0.3);

  // 2. Fade in code v1
  yield* code().opacity(1, animation.durationPresets.normal);
  yield* waitFor(1);

  // 3. Code morph: v1 → v2 (the killer feature)
  yield* all(
    title().text('Code Evolution — v2', animation.durationPresets.fast),
    title().fill(colors.primary, animation.durationPresets.fast),
  );
  yield* code().code(codeV2, animation.durationPresets.slow);
  yield* waitFor(1);

  // 4. Fade out
  yield* all(
    code().opacity(0, animation.durationPresets.normal),
    title().opacity(0, animation.durationPresets.normal),
  );
});
