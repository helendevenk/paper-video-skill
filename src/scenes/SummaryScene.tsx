import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background } from "../components/Background";
import { fontFamily } from "../styles/fonts";
import { colors } from "../styles/colors";
import { springConfigs } from "../styles/animations";

interface KeyNumber {
  value: string;
  label: string;
}

interface SummaryVisual {
  keyNumbers?: KeyNumber[];
  takeaway: string;
}

export const SummaryScene: React.FC<{ visual: SummaryVisual }> = ({
  visual,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const keyNumbers = visual.keyNumbers ?? [];

  return (
    <AbsoluteFill>
      <Background variant="gradient_blue" />

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
        {/* Key numbers row */}
        {keyNumbers.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 80,
              marginBottom: 60,
            }}
          >
            {keyNumbers.map((kn, i) => {
              const numSpring = spring({
                frame,
                fps,
                config: springConfigs.bouncy,
                delay: 10 + i * 12,
              });

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    transform: `scale(${interpolate(numSpring, [0, 1], [0.3, 1])})`,
                    opacity: numSpring,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 72,
                      fontWeight: 900,
                      color: colors.accent,
                      lineHeight: 1,
                    }}
                  >
                    {kn.value}
                  </span>
                  <span
                    style={{
                      fontFamily: fontFamily.sans,
                      fontSize: 22,
                      color: colors.textSecondary,
                      marginTop: 12,
                    }}
                  >
                    {kn.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            width: 200,
            height: 2,
            backgroundColor: colors.primary,
            marginBottom: 40,
            opacity: interpolate(frame, [30, 45], [0, 0.6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />

        {/* Takeaway */}
        {(() => {
          const takeawaySpring = spring({
            frame,
            fps,
            config: springConfigs.gentle,
            delay: 35,
          });
          return (
            <p
              style={{
                fontFamily: fontFamily.sans,
                fontSize: 40,
                fontWeight: 700,
                color: colors.textHighlight,
                textAlign: "center",
                lineHeight: 1.6,
                maxWidth: 1400,
                transform: `translateY(${interpolate(takeawaySpring, [0, 1], [30, 0])}px)`,
                opacity: takeawaySpring,
              }}
            >
              {visual.takeaway}
            </p>
          );
        })()}
      </div>
    </AbsoluteFill>
  );
};
