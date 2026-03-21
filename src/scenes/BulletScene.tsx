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

  const bulletInterval = Math.floor(
    (durationInFrames - 30) / Math.max(visual.points.length, 1)
  );

  return (
    <AbsoluteFill>
      <Background sceneType="bullet" />

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
        {/* Heading with left accent bar */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 48 }}>
          <div
            style={{
              width: 5,
              height: 44,
              backgroundColor: colors.primary,
              borderRadius: 3,
              marginRight: 20,
              opacity: headingSpring,
              transform: `scaleY(${headingSpring})`,
            }}
          />
          <h2
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 52,
              fontWeight: 900,
              color: colors.primary,
              margin: 0,
              transform: `translateY(${interpolate(headingSpring, [0, 1], [20, 0])}px)`,
              opacity: headingSpring,
            }}
          >
            {visual.heading}
          </h2>
        </div>

        {/* Bullet points with progressive highlight */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {visual.points.map((point, i) => {
            const delay = 15 + i * Math.min(bulletInterval, 20);
            const pointSpring = spring({
              frame,
              fps,
              config: springConfigs.gentle,
              delay,
            });

            // Active = currently being narrated
            const activateFrame = delay + 10;
            const nextActivateFrame =
              i < visual.points.length - 1
                ? 15 + (i + 1) * Math.min(bulletInterval, 20) + 10
                : durationInFrames;
            const isActive = frame >= activateFrame && frame < nextActivateFrame;
            const isPast = frame >= nextActivateFrame;

            // Smooth transition for active state
            const activeProgress = isActive
              ? interpolate(
                  frame,
                  [activateFrame, activateFrame + 10],
                  [0, 1],
                  { extrapolateRight: "clamp" }
                )
              : 0;

            const textColor = isActive
              ? colors.textHighlight
              : isPast
                ? `${colors.textPrimary}70`
                : colors.textPrimary;

            const fontSize = isActive ? 38 : 36;

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
                {/* Animated bullet indicator */}
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    marginTop: 14,
                    flexShrink: 0,
                    backgroundColor: isActive
                      ? colors.primary
                      : isPast
                        ? `${colors.primary}50`
                        : colors.textSecondary,
                    boxShadow: isActive
                      ? `0 0 16px ${colors.primary}90, 0 0 4px ${colors.primary}`
                      : "none",
                    transform: `scale(${isActive ? 1.2 : 1})`,
                    transition: "transform 0.2s",
                  }}
                />

                <p
                  style={{
                    fontFamily: fontFamily.sans,
                    fontSize,
                    fontWeight: isActive ? 700 : isPast ? 400 : 500,
                    color: textColor,
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
