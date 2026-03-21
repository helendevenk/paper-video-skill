import { makeScene2D, Rect, Txt, Line } from '@motion-canvas/2d';
import { createRef, waitFor, all, Vector2 } from '@motion-canvas/core';
import { colors, fonts, animation } from '../theme';

/**
 * AlgorithmScene — 算法伪代码 + 步骤高亮
 *
 * 逐行展示伪代码，当前执行行高亮。
 */
export default makeScene2D(function* (view) {
  const bg = createRef<Rect>();
  const title = createRef<Txt>();

  view.add(
    <Rect ref={bg} width={1920} height={1080} fill={colors.background} />
  );

  view.add(
    <Txt
      ref={title}
      text="Algorithm: MSA Router"
      fontSize={36}
      fontFamily={fonts.heading}
      fill={colors.textMuted}
      y={-440}
      opacity={0}
    />
  );

  // Pseudocode lines
  const lines = [
    'function MSA_Router(Q, K_compressed):',
    '    scores = Q · K_compressed^T',
    '    scores = mean(scores, dim=heads)',
    '    scores = max(scores, dim=tokens)',
    '    top_k = argsort(scores)[:k]',
    '    return gather(KV, top_k)',
  ];

  const lineRefs: ReturnType<typeof createRef<Txt>>[] = [];
  const highlightRefs: ReturnType<typeof createRef<Rect>>[] = [];

  const startY = -200;
  const lineHeight = 56;
  const codeX = -300;

  lines.forEach((line, idx) => {
    const tRef = createRef<Txt>();
    const hRef = createRef<Rect>();
    lineRefs.push(tRef);
    highlightRefs.push(hRef);

    const y = startY + idx * lineHeight;

    // Highlight bar (behind text)
    view.add(
      <Rect
        ref={hRef}
        width={800}
        height={lineHeight - 4}
        x={codeX + 350}
        y={y}
        fill={colors.primary}
        opacity={0}
        radius={4}
      />
    );

    // Code text
    view.add(
      <Txt
        ref={tRef}
        text={line}
        fontSize={28}
        fontFamily={fonts.code}
        fill={colors.text}
        x={codeX}
        y={y}
        opacity={0}
        textAlign="left"
      />
    );
  });

  // Line number column
  const lineNumRefs: ReturnType<typeof createRef<Txt>>[] = [];
  lines.forEach((_, idx) => {
    const nRef = createRef<Txt>();
    lineNumRefs.push(nRef);
    view.add(
      <Txt
        ref={nRef}
        text={String(idx + 1)}
        fontSize={22}
        fontFamily={fonts.code}
        fill={colors.textMuted}
        x={codeX - 60}
        y={startY + idx * lineHeight}
        opacity={0}
      />
    );
  });

  // Animation
  yield* title().opacity(1, animation.durationPresets.normal);
  yield* waitFor(0.3);

  // Show all lines at once (faded)
  yield* all(
    ...lineRefs.map(r => r().opacity(0.3, animation.durationPresets.normal)),
    ...lineNumRefs.map(r => r().opacity(0.3, animation.durationPresets.normal)),
  );

  yield* waitFor(0.5);

  // Step through each line
  for (let i = 0; i < lines.length; i++) {
    // Highlight current line
    yield* all(
      highlightRefs[i]().opacity(0.15, animation.durationPresets.fast),
      lineRefs[i]().opacity(1, animation.durationPresets.fast),
      lineRefs[i]().fill(colors.highlight, animation.durationPresets.fast),
      lineNumRefs[i]().opacity(1, animation.durationPresets.fast),
    );

    yield* waitFor(1);

    // Dim current, prepare for next
    yield* all(
      highlightRefs[i]().opacity(0, animation.durationPresets.fast),
      lineRefs[i]().fill(colors.text, animation.durationPresets.fast),
      lineRefs[i]().opacity(0.6, animation.durationPresets.fast),
      lineNumRefs[i]().opacity(0.4, animation.durationPresets.fast),
    );
  }

  yield* waitFor(0.5);

  // Fade out all
  yield* all(
    title().opacity(0, animation.durationPresets.normal),
    ...lineRefs.map(r => r().opacity(0, animation.durationPresets.normal)),
    ...lineNumRefs.map(r => r().opacity(0, animation.durationPresets.normal)),
  );
});
