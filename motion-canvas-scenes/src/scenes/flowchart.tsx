import { makeScene2D, Rect, Txt, Line, Circle } from '@motion-canvas/2d';
import { createRef, waitFor, all, Vector2 } from '@motion-canvas/core';
import { colors, fonts, animation } from '../theme';

/**
 * FlowchartScene — 动态流程图
 *
 * 节点逐步出现 + 箭头连线动画。
 */
export default makeScene2D(function* (view) {
  const bg = createRef<Rect>();

  view.add(
    <Rect ref={bg} width={1920} height={1080} fill={colors.background} />
  );

  // Define flowchart nodes
  const nodes = [
    { id: 'input', label: '文档语料', x: -500, y: -200, color: colors.primary },
    { id: 'encode', label: '离线编码', x: -500, y: 0, color: colors.primary },
    { id: 'compress', label: 'Chunk-Mean\nPooling', x: -500, y: 200, color: colors.primary },
    { id: 'query', label: '用户查询', x: 200, y: -200, color: colors.accent },
    { id: 'router', label: '在线路由', x: 200, y: 0, color: colors.accent },
    { id: 'topk', label: 'Top-k 选择', x: 200, y: 200, color: colors.secondary },
    { id: 'output', label: '稀疏生成', x: -150, y: 380, color: colors.highlight },
  ];

  // Define edges (from → to)
  const edges = [
    { from: 'input', to: 'encode' },
    { from: 'encode', to: 'compress' },
    { from: 'query', to: 'router' },
    { from: 'router', to: 'topk' },
    { from: 'compress', to: 'topk' },
    { from: 'topk', to: 'output' },
  ];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Create node elements
  const nodeRefs: Map<string, ReturnType<typeof createRef<Rect>>> = new Map();
  const nodeLabelRefs: Map<string, ReturnType<typeof createRef<Txt>>> = new Map();

  nodes.forEach(node => {
    const rRef = createRef<Rect>();
    const tRef = createRef<Txt>();
    nodeRefs.set(node.id, rRef);
    nodeLabelRefs.set(node.id, tRef);

    view.add(
      <Rect
        ref={rRef}
        width={200}
        height={80}
        x={node.x}
        y={node.y}
        fill={colors.surface}
        stroke={node.color}
        lineWidth={2}
        radius={12}
        opacity={0}
        scale={0.8}
      />
    );

    view.add(
      <Txt
        ref={tRef}
        text={node.label}
        fontSize={22}
        fontFamily={fonts.body}
        fill={colors.text}
        x={node.x}
        y={node.y}
        textAlign="center"
        opacity={0}
      />
    );
  });

  // Create edge lines
  const edgeRefs: ReturnType<typeof createRef<Line>>[] = [];
  edges.forEach(edge => {
    const from = nodeMap.get(edge.from)!;
    const to = nodeMap.get(edge.to)!;
    const lRef = createRef<Line>();
    edgeRefs.push(lRef);

    view.add(
      <Line
        ref={lRef}
        points={[
          new Vector2(from.x, from.y + 40),
          new Vector2(to.x, to.y - 40),
        ]}
        stroke={colors.textMuted}
        lineWidth={2}
        opacity={0}
        endArrow
        arrowSize={12}
      />
    );
  });

  // Animation: reveal nodes one by one with edges
  const revealOrder = ['input', 'encode', 'compress', 'query', 'router', 'topk', 'output'];

  for (let i = 0; i < revealOrder.length; i++) {
    const nodeId = revealOrder[i];
    const rRef = nodeRefs.get(nodeId)!;
    const tRef = nodeLabelRefs.get(nodeId)!;

    // Reveal node
    yield* all(
      rRef().opacity(1, animation.durationPresets.normal),
      rRef().scale(1, animation.durationPresets.normal),
      tRef().opacity(1, animation.durationPresets.normal),
    );

    // Reveal any edges that end at this node (if source already visible)
    const incomingEdges = edges
      .map((e, idx) => ({ ...e, idx }))
      .filter(e => e.to === nodeId && revealOrder.indexOf(e.from) < i);

    if (incomingEdges.length > 0) {
      yield* all(
        ...incomingEdges.map(e => edgeRefs[e.idx]().opacity(1, animation.durationPresets.fast)),
      );
    }

    yield* waitFor(0.5);
  }

  // Show remaining edges
  const shownEdges = new Set<number>();
  edges.forEach((e, idx) => {
    if (revealOrder.indexOf(e.from) < revealOrder.indexOf(e.to)) {
      shownEdges.add(idx);
    }
  });

  const remainingEdges = edgeRefs
    .map((r, idx) => ({ ref: r, idx }))
    .filter(e => !shownEdges.has(e.idx));

  if (remainingEdges.length > 0) {
    yield* all(
      ...remainingEdges.map(e => e.ref().opacity(1, animation.durationPresets.fast)),
    );
  }

  yield* waitFor(2);

  // Fade out all
  yield* all(
    ...Array.from(nodeRefs.values()).map(r => r().opacity(0, animation.durationPresets.normal)),
    ...Array.from(nodeLabelRefs.values()).map(r => r().opacity(0, animation.durationPresets.normal)),
    ...edgeRefs.map(r => r().opacity(0, animation.durationPresets.normal)),
  );
});
