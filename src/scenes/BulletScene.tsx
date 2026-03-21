import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background } from "../components/Background";
import { fontFamily } from "../styles/fonts";
import { colors } from "../styles/colors";
import { springConfigs } from "../styles/animations";

interface BulletVisual {
  heading: string;
  points: string[];
}

export const BulletScene: React.FC<{ visual: BulletVisual }> = ({ visual }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const headingSpring = spring({
    frame,
    fps,
    config: springConfigs.snappy,
    delay: 5,
  });

  // Evenly space bullet reveals across the scene duration
  const bulletInterval = Math.floor(
    (durationInFrames - 30) / Math.max(visual.points.length, 1)
  );

  return (
    <AbsoluteFill>
      <Background />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 120px",
        }}
      >
        {/* Heading */}
        <h2
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 56,
            fontWeight: 900,
            color: colors.primary,
            marginBottom: 48,
            transform: `translateY(${interpolate(headingSpring, [0, 1], [30, 0])}px)`,
            opacity: headingSpring,
          }}
        >
          {visual.heading}
        </h2>

        {/* Bullet points */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {visual.points.map((point, i) => {
            const delay = 15 + i * Math.min(bulletInterval, 20);
            const pointSpring = spring({
              frame,
              fps,
              config: springConfigs.gentle,
              delay,
            });

            // Highlight the "current" bullet based on time
            const isActive =
              frame >= delay + 10 &&
              (i === visual.points.length - 1 ||
                frame < 15 + (i + 1) * Math.min(bulletInterval, 20) + 10);

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 20,
                  transform: `translateX(${interpolate(pointSpring, [0, 1], [60, 0])}px)`,
                  opacity: pointSpring,
                }}
              >
                {/* Bullet dot */}
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: isActive
                      ? colors.primary
                      : colors.textSecondary,
                    marginTop: 14,
                    flexShrink: 0,
                    boxShadow: isActive
                      ? `0 0 12px ${colors.primary}80`
                      : "none",
                  }}
                />
                <p
                  style={{
                    fontFamily: fontFamily.sans,
                    fontSize: 38,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive
                      ? colors.textHighlight
                      : colors.textPrimary,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {point}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
