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

  // Image entrance animation
  const imgSpring = spring({
    frame,
    fps,
    config: springConfigs.gentle,
    delay: 5,
  });

  // Zoom animation (if zoomRegion specified)
  const hasZoom = !!visual.zoomRegion;
  const zoomStart = Math.floor(durationInFrames * 0.3);
  const zoomProgress = hasZoom
    ? interpolate(frame, [zoomStart, zoomStart + 45], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Calculate transform for zoom
  let imgTransform = `scale(${interpolate(imgSpring, [0, 1], [0.85, 1])})`;
  let imgTransformOrigin = "center center";

  if (hasZoom && zoomProgress > 0) {
    const zr = visual.zoomRegion!;
    const targetScale = 1 / Math.max(zr.w, zr.h);
    const scale = interpolate(zoomProgress, [0, 1], [1, Math.min(targetScale, 2.5)]);
    const tx = interpolate(zoomProgress, [0, 1], [0, -(zr.x + zr.w / 2 - 0.5) * 100]);
    const ty = interpolate(zoomProgress, [0, 1], [0, -(zr.y + zr.h / 2 - 0.5) * 100]);
    imgTransform = `translate(${tx}%, ${ty}%) scale(${scale})`;
  }

  // Caption animation
  const captionOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
          padding: "60px 80px",
        }}
      >
        {/* Image container with border and shadow */}
        <div
          style={{
            width: "85%",
            maxHeight: "75%",
            borderRadius: 16,
            overflow: "hidden",
            border: `2px solid ${colors.border}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 60px ${colors.primary}10`,
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

          {/* Annotations overlay */}
          {visual.annotations?.map((ann, i) => {
            const annDelay = 30 + i * 15;
            const annSpring = spring({
              frame,
              fps,
              config: springConfigs.snappy,
              delay: annDelay,
            });

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${ann.x * 100}%`,
                  top: `${ann.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${interpolate(annSpring, [0, 1], [0.3, 1])})`,
                  opacity: annSpring,
                  backgroundColor: `${ann.color || colors.secondary}dd`,
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 22,
                  fontFamily: fontFamily.sans,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  pointerEvents: "none",
                }}
              >
                {ann.text}
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
