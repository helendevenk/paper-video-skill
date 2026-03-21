import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Background } from "../components/Background";
import { fontFamily } from "../styles/fonts";
import { colors } from "../styles/colors";
import { springConfigs } from "../styles/animations";

interface Annotation {
  x: number;
  y: number;
  text: string;
  color?: string;
}

interface FigureVisual {
  src: string;
  caption?: string;
  zoomRegion?: { x: number; y: number; w: number; h: number };
  annotations?: Annotation[];
}

export const FigureScene: React.FC<{ visual: FigureVisual }> = ({ visual }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const imgSpring = spring({
    frame,
    fps,
    config: springConfigs.gentle,
    delay: 5,
  });

  // Zoom animation
  const hasZoom = !!visual.zoomRegion;
  const zoomStart = Math.floor(durationInFrames * 0.3);
  const zoomProgress = hasZoom
    ? interpolate(frame, [zoomStart, zoomStart + 45], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  let imgTransform = `scale(${interpolate(imgSpring, [0, 1], [0.9, 1])})`;
  if (hasZoom && zoomProgress > 0) {
    const zr = visual.zoomRegion!;
    const targetScale = 1 / Math.max(zr.w, zr.h);
    const scale = interpolate(zoomProgress, [0, 1], [1, Math.min(targetScale, 2.5)]);
    const tx = interpolate(zoomProgress, [0, 1], [0, -(zr.x + zr.w / 2 - 0.5) * 100]);
    const ty = interpolate(zoomProgress, [0, 1], [0, -(zr.y + zr.h / 2 - 0.5) * 100]);
    imgTransform = `translate(${tx}%, ${ty}%) scale(${scale})`;
  }

  const captionOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Background sceneType="figure" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 80px",
        }}
      >
        {/* Image container */}
        <div
          style={{
            position: "relative",
            width: "85%",
            maxHeight: "72%",
            borderRadius: 16,
            overflow: "hidden",
            border: `2px solid ${colors.border}`,
            boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 80px ${colors.primary}15`,
            opacity: imgSpring,
            transform: imgTransform,
          }}
        >
          <Img
            src={visual.src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              backgroundColor: "#ffffff",
            }}
          />

          {/* Annotation overlays with ring + pulse + label */}
          {visual.annotations?.map((ann, i) => {
            const annDelay = 25 + i * 20;
            const annSpring = spring({
              frame,
              fps,
              config: springConfigs.snappy,
              delay: annDelay,
            });
            const annColor = ann.color || colors.secondary;
            const pulseScale = 1 + Math.sin(t * 3 - i) * 0.08;

            return (
              <div key={i}>
                {/* Pulsing ring circle at annotation point */}
                <div
                  style={{
                    position: "absolute",
                    left: `${ann.x * 100}%`,
                    top: `${ann.y * 100}%`,
                    transform: `translate(-50%, -50%) scale(${annSpring * pulseScale})`,
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    border: `3px solid ${annColor}`,
                    boxShadow: `0 0 20px ${annColor}60, inset 0 0 15px ${annColor}20`,
                    opacity: annSpring * 0.9,
                  }}
                />

                {/* Connecting line from ring to label */}
                <svg
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    opacity: annSpring,
                  }}
                >
                  <line
                    x1={`${ann.x * 100}%`}
                    y1={`${ann.y * 100}%`}
                    x2={`${Math.min(ann.x * 100 + 15, 90)}%`}
                    y2={`${Math.max(ann.y * 100 - 12, 5)}%`}
                    stroke={annColor}
                    strokeWidth={2}
                    strokeDasharray="6,3"
                  />
                </svg>

                {/* Label badge */}
                <div
                  style={{
                    position: "absolute",
                    left: `${Math.min(ann.x * 100 + 15, 90)}%`,
                    top: `${Math.max(ann.y * 100 - 12, 5)}%`,
                    transform: `translate(-50%, -100%) scale(${interpolate(annSpring, [0, 1], [0.5, 1])})`,
                    opacity: annSpring,
                    backgroundColor: `${annColor}ee`,
                    color: "#fff",
                    padding: "10px 20px",
                    borderRadius: 10,
                    fontSize: 22,
                    fontFamily: fontFamily.sans,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 12px ${annColor}40`,
                  }}
                >
                  {ann.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Caption */}
        {visual.caption && (
          <p
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 24,
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: 20,
              opacity: captionOpacity,
              fontStyle: "italic",
            }}
          >
            {visual.caption}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
