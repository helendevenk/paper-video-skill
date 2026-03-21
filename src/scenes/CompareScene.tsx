import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Background } from "../components/Background";
import { fontFamily } from "../styles/fonts";
import { colors } from "../styles/colors";
import { springConfigs } from "../styles/animations";

interface CompareVisual {
  heading?: string;
  headers: string[];
  rows: string[][];
  highlightRow?: number;
}

export const CompareScene: React.FC<{ visual: CompareVisual }> = ({ visual }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Row-by-row reveal interval
  const rowInterval = Math.floor(
    (durationInFrames - 40) / Math.max(visual.rows.length, 1)
  );

  return (
    <AbsoluteFill>
      <Background sceneType="compare" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 100px",
        }}
      >
        {/* Heading */}
        {visual.heading && (
          <h2
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 48,
              fontWeight: 900,
              color: colors.primary,
              marginBottom: 40,
              opacity: spring({ frame, fps, config: springConfigs.snappy, delay: 5 }),
            }}
          >
            {visual.heading}
          </h2>
        )}

        {/* Table */}
        <div style={{ width: "100%" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 6px",
              fontFamily: fontFamily.sans,
            }}
          >
            {/* Header row */}
            <thead>
              <tr>
                {visual.headers.map((h, i) => {
                  const hSpring = spring({
                    frame,
                    fps,
                    config: springConfigs.snappy,
                    delay: 8 + i * 3,
                  });
                  return (
                    <th
                      key={i}
                      style={{
                        padding: "16px 24px",
                        fontSize: 26,
                        fontWeight: 700,
                        color: colors.primary,
                        textAlign: i === 0 ? "left" : "center",
                        borderBottom: `2px solid ${colors.primary}40`,
                        opacity: hSpring,
                        transform: `translateY(${interpolate(hSpring, [0, 1], [15, 0])}px)`,
                      }}
                    >
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visual.rows.map((row, rowIdx) => {
                const rowDelay = 20 + rowIdx * Math.min(rowInterval / 2, 12);
                const rowSpring = spring({
                  frame,
                  fps,
                  config: springConfigs.gentle,
                  delay: rowDelay,
                });
                const isHighlight = rowIdx === visual.highlightRow;

                // Active row tracking — highlight current row being narrated
                const rowActiveStart = 20 + rowIdx * rowInterval;
                const rowActiveEnd =
                  rowIdx < visual.rows.length - 1
                    ? 20 + (rowIdx + 1) * rowInterval
                    : durationInFrames;
                const isCurrentlyActive =
                  frame >= rowActiveStart && frame < rowActiveEnd;

                const bgColor = isHighlight
                  ? `${colors.accent}20`
                  : isCurrentlyActive
                    ? `${colors.primary}12`
                    : `${colors.bgCard}80`;

                const textColor = isHighlight
                  ? colors.accent
                  : isCurrentlyActive
                    ? colors.textHighlight
                    : colors.textPrimary;

                return (
                  <tr
                    key={rowIdx}
                    style={{
                      opacity: rowSpring,
                      transform: `translateX(${interpolate(rowSpring, [0, 1], [40, 0])}px)`,
                    }}
                  >
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        style={{
                          padding: "14px 24px",
                          fontSize: 28,
                          fontWeight: isHighlight ? 800 : isCurrentlyActive ? 600 : 400,
                          color: textColor,
                          textAlign: cellIdx === 0 ? "left" : "center",
                          backgroundColor: bgColor,
                          borderRadius:
                            cellIdx === 0
                              ? "8px 0 0 8px"
                              : cellIdx === row.length - 1
                                ? "0 8px 8px 0"
                                : 0,
                          borderLeft:
                            cellIdx === 0 && (isHighlight || isCurrentlyActive)
                              ? `4px solid ${isHighlight ? colors.accent : colors.primary}`
                              : cellIdx === 0
                                ? "4px solid transparent"
                                : "none",
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AbsoluteFill>
  );
};
