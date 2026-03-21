import { makeScene2D, Latex, Rect, Txt } from '@motion-canvas/2d';
import { createRef, waitFor, all, sequence } from '@motion-canvas/core';
import { colors, fonts, animation } from '../theme';

/**
 * FormulaDeriveScene — LaTeX 公式连续推导动画
 *
 * 逐步展示公式推导过程，每步淡入并高亮当前步骤。
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
      text="Formula Derivation"
      fontSize={36}
      fontFamily={fonts.heading}
      fill={colors.textMuted}
      y={-440}
      opacity={0}
    />
  );

  // Demo: Attention score formula derivation
  const steps = [
    { latex: 'S_i = Q \\cdot K_i^T', label: 'Query-Key dot product' },
    { latex: 'S_i = \\max_t \\text{mean}_h(Q_r \\cdot K_{r,i}^T)', label: 'Router scoring' },
    { latex: '\\text{Top-k}: \\{i \\mid S_i \\geq S_{(k)}\\}', label: 'Top-k selection' },
  ];

  const formulaRefs: ReturnType<typeof createRef<Latex>>[] = [];
  const labelRefs: ReturnType<typeof createRef<Txt>>[] = [];

  steps.forEach((step, idx) => {
    const fRef = createRef<Latex>();
    const lRef = createRef<Txt>();
    formulaRefs.push(fRef);
    labelRefs.push(lRef);

    const yPos = -120 + idx * 160;

    view.add(
      <Latex
        ref={fRef}
        tex={`{\\color{white} ${step.latex}}`}
        height={60}
        y={yPos}
        opacity={0}
      />
    );

    view.add(
      <Txt
        ref={lRef}
        text={step.label}
        fontSize={24}
        fontFamily={fonts.body}
        fill={colors.textMuted}
        y={yPos + 50}
        opacity={0}
      />
    );
  });

  // Animation
  yield* title().opacity(1, animation.durationPresets.normal);
  yield* waitFor(0.5);

  // Reveal each step sequentially
  for (let i = 0; i < steps.length; i++) {
    // Dim previous steps
    if (i > 0) {
      yield* all(
        formulaRefs[i - 1]().opacity(0.4, animation.durationPresets.fast),
        labelRefs[i - 1]().opacity(0.3, animation.durationPresets.fast),
      );
    }

    // Show current step
    yield* all(
      formulaRefs[i]().opacity(1, animation.durationPresets.normal),
      labelRefs[i]().opacity(1, animation.durationPresets.normal),
    );

    yield* waitFor(1.2);
  }

  // Final: show all at equal opacity
  yield* all(
    ...formulaRefs.map(r => r().opacity(0.9, animation.durationPresets.normal)),
    ...labelRefs.map(r => r().opacity(0.7, animation.durationPresets.normal)),
  );

  yield* waitFor(1);

  // Fade out
  yield* all(
    title().opacity(0, animation.durationPresets.normal),
    ...formulaRefs.map(r => r().opacity(0, animation.durationPresets.normal)),
    ...labelRefs.map(r => r().opacity(0, animation.durationPresets.normal)),
  );
});
