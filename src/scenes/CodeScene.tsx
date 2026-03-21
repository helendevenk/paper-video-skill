import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import { Background } from "../components/Background";
import { fontFamily } from "../styles/fonts";
import { colors } from "../styles/colors";
import { springConfigs } from "../styles/animations";

// Register languages
hljs.registerLanguage("python", python);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);

// Catppuccin-inspired code theme
const codeThemeCSS = `
.hljs-keyword { color: #cba6f7; }
.hljs-string { color: #a6e3a1; }
.hljs-number { color: #fab387; }
.hljs-built_in { color: #89b4fa; }
.hljs-function { color: #89dceb; }
.hljs-comment { color: #6c7086; font-style: italic; }
.hljs-params { color: #f2cdcd; }
.hljs-attr { color: #f9e2af; }
.hljs-title { color: #89b4fa; }
.hljs-variable { color: #cdd6f4; }
.hljs-operator { color: #89dceb; }
.hljs-punctuation { color: #bac2de; }
`;

interface CodeVisual {
  language?: string;
  code: string;
  highlightLines?: number[];
  reveal?: "all" | "line_by_line";
}

export const CodeScene: React.FC<{ visual: CodeVisual }> = ({ visual }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const lang = visual.language || "python";
  const codeLines = visual.code.split("\n");
  const highlightSet = new Set(visual.highlightLines || []);
  const isLineByLine = visual.reveal === "line_by_line";

  // Highlight code
  let highlighted: string;
  try {
    highlighted = hljs.highlight(visual.code, { language: lang }).value;
  } catch {
    highlighted = visual.code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  const highlightedLines = highlighted.split("\n");

  const headerSpring = spring({
    frame,
    fps,
    config: springConfigs.snappy,
    delay: 5,
  });

  const lineInterval = isLineByLine
    ? Math.floor((durationInFrames - 30) / Math.max(codeLines.length, 1))
    : 0;

  return (
    <AbsoluteFill>
      <Background sceneType="code" />
      <style dangerouslySetInnerHTML={{ __html: codeThemeCSS }} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 100px",
        }}
      >
        {/* Code window header */}
        <div
          style={{
            width: "85%",
            opacity: headerSpring,
            transform: `translateY(${interpolate(headerSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          {/* Window title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              backgroundColor: "#181825",
              borderRadius: "12px 12px 0 0",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#f38ba8" }} />
            <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#f9e2af" }} />
            <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#a6e3a1" }} />
            <span
              style={{
                marginLeft: 12,
                fontFamily: fontFamily.mono,
                fontSize: 14,
                color: colors.textSecondary,
              }}
            >
              {lang}
            </span>
          </div>

          {/* Code content */}
          <div
            style={{
              backgroundColor: colors.codeBackground,
              borderRadius: "0 0 12px 12px",
              padding: "24px 0",
              overflow: "hidden",
            }}
          >
            {highlightedLines.map((lineHtml, i) => {
              const lineNum = i + 1;
              const isHighlighted = highlightSet.has(lineNum);

              // Line-by-line reveal
              let lineOpacity = 1;
              if (isLineByLine) {
                const lineDelay = 10 + i * Math.min(lineInterval, 15);
                lineOpacity = spring({
                  frame,
                  fps,
                  config: springConfigs.gentle,
                  delay: lineDelay,
                });
              }

              // Active line tracking
              const lineActiveStart = isLineByLine ? 10 + i * lineInterval : 0;
              const lineActiveEnd = isLineByLine
                ? i < codeLines.length - 1 ? 10 + (i + 1) * lineInterval : durationInFrames
                : 0;
              const isActiveLine = isLineByLine && frame >= lineActiveStart && frame < lineActiveEnd;

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    opacity: lineOpacity,
                    backgroundColor: isActiveLine
                      ? `${colors.primary}15`
                      : isHighlighted
                        ? `${colors.accent}10`
                        : "transparent",
                    borderLeft: isActiveLine
                      ? `3px solid ${colors.primary}`
                      : isHighlighted
                        ? `3px solid ${colors.accent}80`
                        : "3px solid transparent",
                  }}
                >
                  {/* Line number */}
                  <span
                    style={{
                      display: "inline-block",
                      width: 50,
                      textAlign: "right",
                      paddingRight: 16,
                      fontFamily: fontFamily.mono,
                      fontSize: 22,
                      color: isActiveLine ? colors.primary : `${colors.textSecondary}60`,
                      userSelect: "none",
                      lineHeight: 1.7,
                    }}
                  >
                    {lineNum}
                  </span>
                  {/* Code */}
                  <span
                    dangerouslySetInnerHTML={{ __html: lineHtml || "&nbsp;" }}
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 26,
                      lineHeight: 1.7,
                      color: colors.codeForeground,
                      paddingRight: 24,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
