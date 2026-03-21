import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors } from "../styles/colors";

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: `${colors.border}60`,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: colors.primary,
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
};
