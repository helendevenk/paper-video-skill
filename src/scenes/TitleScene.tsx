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
  const t = frame / fps;

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

  const lineWidth = interpolate(frame, [5, 35], [0, 500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Floating particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    x: 10 + (i * 73) % 80,
    y: 10 + (i * 47) % 80,
    size: 2 + (i % 3),
    speed: 0.2 + (i % 5) * 0.1,
    delay: i * 3,
  }));

  return (
    <AbsoluteFill>
      <Background variant={visual.background} sceneType="title" />

      {/* Floating particles */}
      {particles.map((p, i) => {
        const pOpacity = interpolate(frame, [p.delay, p.delay + 20], [0, 0.4], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x + Math.sin(t * p.speed + i) * 3}%`,
              top: `${p.y + Math.cos(t * p.speed * 0.7 + i) * 2}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: colors.primary,
              opacity: pOpacity,
              boxShadow: `0 0 ${p.size * 3}px ${colors.primary}40`,
            }}
          />
        );
      })}

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
            background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
            marginBottom: 40,
            borderRadius: 2,
          }}
        />

        {/* Title with glow */}
        <h1
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 76,
            fontWeight: 900,
            color: colors.textHighlight,
            textAlign: "center",
            lineHeight: 1.2,
            margin: 0,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [50, 0])}px) scale(${interpolate(titleSpring, [0, 1], [0.9, 1])})`,
            opacity: titleSpring,
            textShadow: `0 0 40px ${colors.primary}30`,
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
              letterSpacing: 2,
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
            background: `linear-gradient(90deg, transparent, ${colors.primary}60, transparent)`,
            marginTop: 40,
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
