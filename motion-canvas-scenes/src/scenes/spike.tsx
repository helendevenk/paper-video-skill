import { makeScene2D, Txt, Rect } from '@motion-canvas/2d';
import { createRef, waitFor, all } from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  const title = createRef<Txt>();
  const bg = createRef<Rect>();

  // Dark background matching paper-video theme
  view.add(
    <Rect
      ref={bg}
      width={1920}
      height={1080}
      fill="#0f172a"
    />
  );

  view.add(
    <Txt
      ref={title}
      text="Motion Canvas Spike"
      fontSize={72}
      fontFamily="Inter"
      fill="#f1f5f9"
      opacity={0}
    />
  );

  // Fade in
  yield* title().opacity(1, 0.8);
  yield* waitFor(0.5);

  // Color change
  yield* all(
    title().fill('#3b82f6', 0.6),
    title().fontSize(96, 0.6),
  );

  yield* waitFor(0.5);

  // Fade out
  yield* title().opacity(0, 0.5);
});
