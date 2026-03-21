import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface ProgressBarProps {
  sceneIndex?: number;
  totalScenes?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  sceneIndex,
  totalScenes,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: "clamp",
  });

  const showLabel = sceneIndex !== undefined && totalScenes !== undefined;

  return (
    <>
      {/* Scene counter badge */}
      {showLabel && (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: interpolate(frame, [10, 25], [0, 0.6], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 16,
              color: colors.textSecondary,
              backgroundColor: `${colors.bgCard}cc`,
              padding: "4px 12px",
              borderRadius: 6,
              border: `1px solid ${colors.border}`,
            }}
          >
            {sceneIndex! + 1} / {totalScenes}
          </span>
        </div>
      )}

      {/* Bottom progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: `${colors.border}40`,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
            borderRadius: "0 2px 2px 0",
            boxShadow: `0 0 8px ${colors.primary}60`,
          }}
        />
      </div>
    </>
  );
};
