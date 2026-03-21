import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors } from "../styles/colors";

interface BackgroundProps {
  variant?: string;
  sceneType?: string;
}

export const Background: React.FC<BackgroundProps> = ({
  variant = "gradient_dark",
  sceneType,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Scene-type specific accent colors for visual variety
  const accentMap: Record<string, string> = {
    title: "#4fc3f744",
    bullet: "#81c78420",
    figure: "#4fc3f715",
    compare: "#ffb74d20",
    summary: "#4fc3f730",
    code_diff: "#81c78425",
    formula_derive: "#ce93d825",
    algorithm: "#4fc3f720",
    flowchart: "#81c78420",
  };
  const accent = accentMap[sceneType || ""] || "#4fc3f715";

  // Slow-moving gradient glow positions
  const glowX1 = 20 + Math.sin(t * 0.3) * 15;
  const glowY1 = 75 + Math.cos(t * 0.2) * 10;
  const glowX2 = 80 + Math.cos(t * 0.25) * 12;
  const glowY2 = 25 + Math.sin(t * 0.35) * 8;

  return (
    <AbsoluteFill>
      {/* Base gradient */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `radial-gradient(ellipse at ${glowX1}% ${glowY1}%, ${colors.bgCardAlt} 0%, ${colors.bg} 55%)`,
        }}
      />

      {/* Secondary floating glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${glowX2}% ${glowY2}%, ${accent} 0%, transparent 50%)`,
        }}
      />

      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${colors.border}18 1px, transparent 1px), linear-gradient(90deg, ${colors.border}18 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          opacity: 0.6,
        }}
      />

      {/* Top-edge glow line (subtle) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.primary}60, transparent)`,
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Vignette corners */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
