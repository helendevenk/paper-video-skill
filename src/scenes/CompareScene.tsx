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
  const { fps } = useVideoConfig();

  const tableSpring = spring({
    frame,
    fps,
    config: springConfigs.gentle,
    delay: 10,
  });

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
        <div
          style={{
            width: "100%",
            opacity: tableSpring,
            transform: `translateY(${interpolate(tableSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 6px",
              fontFamily: fontFamily.sans,
            }}
          >
            {/* Header */}
            <thead>
              <tr>
                {visual.headers.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "16px 24px",
                      fontSize: 26,
                      fontWeight: 700,
                      color: colors.primary,
                      textAlign: i === 0 ? "left" : "center",
                      borderBottom: `2px solid ${colors.primary}40`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visual.rows.map((row, rowIdx) => {
                const rowDelay = 20 + rowIdx * 8;
                const rowSpring = spring({
                  frame,
                  fps,
                  config: springConfigs.gentle,
                  delay: rowDelay,
                });
                const isHighlight = rowIdx === visual.highlightRow;

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
                          fontWeight: isHighlight ? 800 : 400,
                          color: isHighlight
                            ? colors.accent
                            : colors.textPrimary,
                          textAlign: cellIdx === 0 ? "left" : "center",
                          backgroundColor: isHighlight
                            ? `${colors.accent}15`
                            : `${colors.bgCard}80`,
                          borderRadius: cellIdx === 0
                            ? "8px 0 0 8px"
                            : cellIdx === row.length - 1
                              ? "0 8px 8px 0"
                              : 0,
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
