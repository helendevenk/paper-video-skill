import { z } from "zod";

// ─── Word-level timestamp from TTS ───
export const WordTimestampSchema = z.object({
  word: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});
export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

// ─── Audio data (filled by Stage 2c enrichment) ───
export const SceneAudioSchema = z.object({
  file: z.string(),
  durationSeconds: z.number(),
  wordTimestamps: z.array(WordTimestampSchema),
});
export type SceneAudio = z.infer<typeof SceneAudioSchema>;

// ─── Transition ───
export const TransitionSchema = z.object({
  type: z.enum(["fade", "slide", "wipe", "none"]).default("fade"),
  durationSeconds: z.number().default(0.5),
});
export type Transition = z.infer<typeof TransitionSchema>;

// ─── Annotation (for FigureScene) ───
export const AnnotationSchema = z.object({
  x: z.number(),
  y: z.number(),
  text: z.string(),
  color: z.string().default("#4CAF50"),
  w: z.number().optional(),  // highlight box width (% of image, 0 = no box)
  h: z.number().optional(),  // highlight box height (% of image, 0 = no box)
  style: z.enum(["box", "label", "pointer"]).default("box"),
});

// ─── Visual payloads per scene type ───
export const TitleVisualSchema = z.object({
  title: z.string(),
  subtitle: z.string().default(""),
  authors: z.array(z.string()).default([]),
  background: z.string().default("gradient_dark"),
});

export const BulletVisualSchema = z.object({
  heading: z.string(),
  points: z.array(z.string()),
});

export const FigureVisualSchema = z.object({
  src: z.string(),
  caption: z.string().default(""),
  zoomRegion: z
    .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
    .optional(),
  annotations: z.array(AnnotationSchema).default([]),
});

export const CodeVisualSchema = z.object({
  language: z.string().default("python"),
  code: z.string(),
  highlightLines: z.array(z.number()).default([]),
  reveal: z.enum(["all", "line_by_line"]).default("all"),
});

export const FormulaVisualSchema = z.object({
  steps: z.array(z.string()),
  labels: z.array(z.string()).default([]),
});

export const CompareVisualSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  highlightRow: z.number().optional(),
});

export const SummaryVisualSchema = z.object({
  keyNumbers: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .default([]),
  takeaway: z.string(),
});

// ─── New Visual Schemas (Motion Canvas scenes) ───
export const CodeDiffVisualSchema = z.object({
  language: z.string().default("python"),
  codeV1: z.string(),
  codeV2: z.string(),
  description: z.string().default(""),
  highlightChanges: z.boolean().default(true),
});

export const FormulaDeriveVisualSchema = z.object({
  steps: z.array(
    z.object({
      latex: z.string(),
      label: z.string().default(""),
      highlight: z.string().optional(),
    })
  ),
  direction: z.enum(["forward", "simplify"]).default("forward"),
});

export const AlgorithmVisualSchema = z.object({
  title: z.string(),
  pseudocode: z.string(),
  highlightSteps: z.array(z.number()).default([]),
  dataStructure: z.record(z.unknown()).optional(),
});

export const FlowchartVisualSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z
        .enum(["process", "decision", "io", "start_end"])
        .default("process"),
    })
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      label: z.string().default(""),
    })
  ),
  revealOrder: z.array(z.string()).default([]),
});

// ─── New Visual Schemas (Manim scenes) ───
export const Arch3DVisualSchema = z.object({
  layers: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["dense", "conv", "attention", "norm", "custom"]),
      size: z.array(z.number()),
      color: z.string().optional(),
    })
  ),
  connections: z.enum(["sequential", "skip", "custom"]).default("sequential"),
  cameraAngle: z
    .object({
      phi: z.number().default(75),
      theta: z.number().default(-45),
    })
    .default({}),
});

// ─── Scene (discriminated union on type) ───
export const SceneSchema = z.object({
  id: z.string(),
  type: z.enum([
    // Remotion
    "title",
    "bullet",
    "figure",
    "code",
    "formula",
    "compare",
    "summary",
    // Motion Canvas
    "code_diff",
    "formula_derive",
    "algorithm",
    "flowchart",
    // Manim
    "arch_3d",
    "math_3d",
  ]),
  narration: z.string(),
  durationHint: z.number().default(10),
  transition: TransitionSchema.default({ type: "fade", durationSeconds: 0.5 }),
  audio: SceneAudioSchema.nullable().default(null),
  notes: z.string().default(""),
  visual: z.record(z.unknown()),
});
export type Scene = z.infer<typeof SceneSchema>;

// ─── Full script ───
export const ScriptMetaSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()).default([]),
  durationEstimateSeconds: z.number().default(300),
  language: z.string().default("zh-CN"),
  style: z.string().default("tech_explainer"),
});

export const ScriptSchema = z.object({
  meta: ScriptMetaSchema,
  scenes: z.array(SceneSchema),
});
export type Script = z.infer<typeof ScriptSchema>;

// ─── Props for the SceneVideo Remotion component ───
export const SceneVideoPropsSchema = z.object({
  scene: SceneSchema,
  fps: z.number().default(30),
});
export type SceneVideoProps = z.infer<typeof SceneVideoPropsSchema>;
