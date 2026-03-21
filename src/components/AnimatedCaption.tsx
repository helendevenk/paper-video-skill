import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { fontFamily } from "../styles/fonts";
import { colors } from "../styles/colors";
import type { WordTimestamp } from "../types";

interface AnimatedCaptionProps {
  wordTimestamps: WordTimestamp[];
}

/**
 * Sentence-level caption display.
 * Shows one sentence at a time with smooth fade transitions.
 * Current sentence highlighted, previous sentence fades out.
 */
export const AnimatedCaption: React.FC<AnimatedCaptionProps> = ({
  wordTimestamps,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  if (wordTimestamps.length === 0) return null;

  // Find current sentence (each WordTimestamp entry is a sentence/clause)
  const currentIdx = wordTimestamps.findIndex(
    (w) => w.startMs <= currentMs && w.endMs >= currentMs
  );

  // If between sentences, show the last one fading out
  if (currentIdx === -1) {
    const lastIdx = wordTimestamps.findLastIndex((w) => w.endMs <= currentMs);
    if (lastIdx === -1) return null;
    const elapsed = currentMs - wordTimestamps[lastIdx].endMs;
    if (elapsed > 400) return null;
    const opacity = interpolate(elapsed, [0, 400], [1, 0], {
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

  // Fade in at the start of each sentence
  const fadeIn = interpolate(elapsed, [0, 200], [0, 1], {
    extrapolateRight: "clamp",
  });

  return <CaptionLine text={sentence.word} opacity={fadeIn} progress={progress} />;
};

const CaptionLine: React.FC<{
  text: string;
  opacity: number;
  progress: number;
}> = ({ text, opacity, progress }) => {
  // Split long sentences into multiple lines (~20 chars per line for Chinese)
  const maxCharsPerLine = 20;
  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > maxCharsPerLine) {
    // Find a good break point (punctuation or space)
    let breakIdx = -1;
    const punctuation = "，。、；：！？,.;:!? ";
    for (let i = maxCharsPerLine; i >= maxCharsPerLine - 5 && i > 0; i--) {
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

  // Calculate how many chars to highlight (reading progress)
  const totalChars = text.length;
  const highlightedChars = Math.floor(progress * totalChars);

  let charCount = 0;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 60,
        right: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity,
      }}
    >
      {/* Semi-transparent background pill */}
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          borderRadius: 16,
          padding: "16px 32px",
          backdropFilter: "blur(8px)",
        }}
      >
        {lines.map((line, lineIdx) => (
          <div
            key={lineIdx}
            style={{
              textAlign: "center",
              lineHeight: 1.7,
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
                    fontSize: 36,
                    fontWeight: 600,
                    color: isHighlighted ? colors.textHighlight : `${colors.textPrimary}99`,
                    textShadow: isHighlighted
                      ? "0 1px 4px rgba(0,0,0,0.5)"
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
