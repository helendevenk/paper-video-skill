import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { fontFamily } from "../styles/fonts";
import { colors } from "../styles/colors";
import type { WordTimestamp } from "../types";

interface AnimatedCaptionProps {
  wordTimestamps: WordTimestamp[];
}

export const AnimatedCaption: React.FC<AnimatedCaptionProps> = ({
  wordTimestamps,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  if (wordTimestamps.length === 0) return null;

  const currentIdx = wordTimestamps.findIndex(
    (w) => w.startMs <= currentMs && w.endMs >= currentMs
  );

  if (currentIdx === -1) {
    const lastIdx = wordTimestamps.findLastIndex((w) => w.endMs <= currentMs);
    if (lastIdx === -1) return null;
    const elapsed = currentMs - wordTimestamps[lastIdx].endMs;
    if (elapsed > 500) return null;
    const opacity = interpolate(elapsed, [0, 500], [1, 0], {
      extrapolateRight: "clamp",
    });
    return (
      <CaptionLine text={wordTimestamps[lastIdx].word} opacity={opacity} progress={1} />
    );
  }

  const sentence = wordTimestamps[currentIdx];
  const sentenceDur = sentence.endMs - sentence.startMs;
  const elapsed = currentMs - sentence.startMs;
  const progress = sentenceDur > 0 ? Math.min(elapsed / sentenceDur, 1) : 1;
  const fadeIn = interpolate(elapsed, [0, 150], [0, 1], {
    extrapolateRight: "clamp",
  });

  return <CaptionLine text={sentence.word} opacity={fadeIn} progress={progress} />;
};

const CaptionLine: React.FC<{
  text: string;
  opacity: number;
  progress: number;
}> = ({ text, opacity, progress }) => {
  const maxCharsPerLine = 22;
  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > maxCharsPerLine) {
    let breakIdx = -1;
    const punctuation = "，。、；：！？,.;:!? ";
    for (let i = maxCharsPerLine; i >= maxCharsPerLine - 6 && i > 0; i--) {
      if (punctuation.includes(remaining[i])) {
        breakIdx = i + 1;
        break;
      }
    }
    if (breakIdx === -1) breakIdx = maxCharsPerLine;
    lines.push(remaining.slice(0, breakIdx));
    remaining = remaining.slice(breakIdx);
  }
  if (remaining) lines.push(remaining);

  const totalChars = text.length;
  const highlightedChars = Math.floor(progress * totalChars);
  let charCount = 0;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      {/* Full-width semi-transparent bar */}
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.72)",
          borderRadius: 12,
          padding: "18px 48px",
          backdropFilter: "blur(12px)",
          maxWidth: "80%",
          border: `1px solid rgba(255,255,255,0.08)`,
        }}
      >
        {lines.map((line, lineIdx) => (
          <div
            key={lineIdx}
            style={{
              textAlign: "center",
              lineHeight: 1.8,
            }}
          >
            {line.split("").map((char, charIdx) => {
              const globalIdx = charCount++;
              const isHighlighted = globalIdx < highlightedChars;
              return (
                <span
                  key={charIdx}
                  style={{
                    fontFamily: fontFamily.sans,
                    fontSize: 38,
                    fontWeight: 600,
                    color: isHighlighted
                      ? colors.textHighlight
                      : `${colors.textPrimary}60`,
                    textShadow: isHighlighted
                      ? "0 2px 8px rgba(0,0,0,0.6)"
                      : "none",
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
