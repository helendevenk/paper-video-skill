import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background } from "../components/Background";
import { fontFamily } from "../styles/fonts";
import { colors } from "../styles/colors";
import { springConfigs } from "../styles/animations";

interface TitleVisual {
  title: string;
  subtitle?: string;
  authors?: string[];
  background?: string;
}

export const TitleScene: React.FC<{ visual: TitleVisual }> = ({ visual }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: springConfigs.snappy,
    delay: 10,
  });

  const subtitleSpring = spring({
    frame,
    fps,
    config: springConfigs.gentle,
    delay: 25,
  });

  const authorsOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Decorative line
  const lineWidth = interpolate(frame, [5, 30], [0, 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Background variant={visual.background} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 120px",
        }}
      >
        {/* Decorative top line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            backgroundColor: colors.primary,
            marginBottom: 40,
            borderRadius: 2,
          }}
        />

        {/* Title */}
        <h1
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 72,
            fontWeight: 900,
            color: colors.textHighlight,
            textAlign: "center",
            lineHeight: 1.2,
            margin: 0,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px)`,
            opacity: titleSpring,
          }}
        >
          {visual.title}
        </h1>

        {/* Subtitle */}
        {visual.subtitle && (
          <p
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 36,
              fontWeight: 500,
              color: colors.primary,
              textAlign: "center",
              marginTop: 24,
              transform: `translateY(${interpolate(subtitleSpring, [0, 1], [30, 0])}px)`,
              opacity: subtitleSpring,
            }}
          >
            {visual.subtitle}
          </p>
        )}

        {/* Authors */}
        {visual.authors && visual.authors.length > 0 && (
          <p
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 24,
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: 32,
              opacity: authorsOpacity,
            }}
          >
            {visual.authors.join(" · ")}
          </p>
        )}

        {/* Decorative bottom line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            backgroundColor: colors.primary,
            marginTop: 40,
            borderRadius: 2,
            opacity: 0.5,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
