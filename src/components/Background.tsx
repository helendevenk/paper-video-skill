import { AbsoluteFill } from "remotion";
import { colors } from "../styles/colors";

export const Background: React.FC<{ variant?: string }> = ({
  variant = "gradient_dark",
}) => {
  const gradients: Record<string, string> = {
    gradient_dark: `radial-gradient(ellipse at 20% 80%, ${colors.bgCardAlt} 0%, ${colors.bg} 60%)`,
    gradient_blue: `radial-gradient(ellipse at 80% 20%, #1a237e 0%, ${colors.bg} 60%)`,
    solid_dark: colors.bg,
  };

  const bg = gradients[variant] ?? gradients.gradient_dark;

  return (
    <AbsoluteFill>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: bg,
        }}
      />
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${colors.border}22 1px, transparent 1px), linear-gradient(90deg, ${colors.border}22 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </AbsoluteFill>
  );
};
