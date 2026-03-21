import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import katex from "katex";
import { Background } from "../components/Background";
import { fontFamily } from "../styles/fonts";
import { colors } from "../styles/colors";
import { springConfigs } from "../styles/animations";

interface FormulaStep {
  latex: string;
  label: string;
}

interface FormulaVisual {
  steps: FormulaStep[] | string[];
  labels?: string[];
}

const katexCSS = `
.katex { font-size: 1em; }
.katex .mathnormal { font-family: KaTeX_Math, serif; }
.katex .mathit { font-style: italic; }
`;

function renderLatex(tex: string): string {
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode: true,
      output: "html",
    });
  } catch {
    return `<span style="color: #ef5350">${tex}</span>`;
  }
}

export const FormulaScene: React.FC<{ visual: FormulaVisual }> = ({ visual }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Normalize steps — handle both old format (string[]) and new format ({latex, label}[])
  const steps: FormulaStep[] = visual.steps.map((s, i) => {
    if (typeof s === "string") {
      return { latex: s, label: visual.labels?.[i] || "" };
    }
    return s as FormulaStep;
  });

  const stepInterval = Math.floor((durationInFrames - 40) / Math.max(steps.length, 1));

  const headingSpring = spring({
    frame,
    fps,
    config: springConfigs.snappy,
    delay: 5,
  });

  return (
    <AbsoluteFill>
      <Background sceneType="formula" />

      {/* KaTeX CSS */}
      <style dangerouslySetInnerHTML={{ __html: katexCSS }} />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 140px",
        }}
      >
        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 50,
            opacity: headingSpring,
          }}
        >
          <div
            style={{
              width: 5,
              height: 40,
              backgroundColor: colors.primary,
              borderRadius: 3,
              marginRight: 18,
            }}
          />
          <h2
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 44,
              fontWeight: 900,
              color: colors.primary,
              margin: 0,
            }}
          >
            公式推导
          </h2>
        </div>

        {/* Formula steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {steps.map((step, i) => {
            const stepDelay = 15 + i * Math.min(stepInterval, 25);
            const stepSpring = spring({
              frame,
              fps,
              config: springConfigs.gentle,
              delay: stepDelay,
            });

            const activateFrame = stepDelay + 10;
            const nextActivateFrame =
              i < steps.length - 1
                ? 15 + (i + 1) * Math.min(stepInterval, 25) + 10
                : durationInFrames;
            const isActive = frame >= activateFrame && frame < nextActivateFrame;
            const isPast = frame >= nextActivateFrame;

            const html = renderLatex(step.latex);

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: stepSpring,
                  transform: `translateX(${interpolate(stepSpring, [0, 1], [40, 0])}px)`,
                }}
              >
                {/* Step number */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isActive
                      ? colors.primary
                      : isPast
                        ? `${colors.primary}40`
                        : colors.bgCard,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: fontFamily.mono,
                    color: isActive ? "#fff" : colors.textSecondary,
                    flexShrink: 0,
                    border: `2px solid ${isActive ? colors.primary : colors.border}`,
                    boxShadow: isActive ? `0 0 12px ${colors.primary}50` : "none",
                  }}
                >
                  {i + 1}
                </div>

                {/* Formula + label container */}
                <div
                  style={{
                    flex: 1,
                    padding: "16px 24px",
                    backgroundColor: isActive
                      ? `${colors.primary}10`
                      : `${colors.bgCard}80`,
                    borderRadius: 12,
                    borderLeft: isActive
                      ? `3px solid ${colors.primary}`
                      : "3px solid transparent",
                  }}
                >
                  {/* KaTeX rendered formula */}
                  <div
                    dangerouslySetInnerHTML={{ __html: html }}
                    style={{
                      fontSize: 36,
                      color: isActive
                        ? colors.textHighlight
                        : isPast
                          ? `${colors.textPrimary}70`
                          : colors.textPrimary,
                      lineHeight: 1.6,
                    }}
                  />

                  {/* Step label */}
                  {step.label && (
                    <div
                      style={{
                        fontFamily: fontFamily.sans,
                        fontSize: 20,
                        color: isActive ? colors.primary : colors.textSecondary,
                        marginTop: 6,
                      }}
                    >
                      {step.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
