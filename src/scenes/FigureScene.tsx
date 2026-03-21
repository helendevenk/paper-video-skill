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
  const zoomStart = Math.floor(durationInFrames * 0.35);
  const zoomEnd = Math.floor(durationInFrames * 0.75);
  const zoomProgress = hasZoom
    ? interpolate(frame, [zoomStart, zoomStart + 40], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  // Zoom back out near end
  const zoomOut = hasZoom
    ? interpolate(frame, [zoomEnd, zoomEnd + 30], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const effectiveZoom = zoomProgress * (1 - zoomOut);

  let imgTransform = `scale(${interpolate(imgSpring, [0, 1], [0.92, 1])})`;
  if (hasZoom && effectiveZoom > 0) {
    const zr = visual.zoomRegion!;
    const targetScale = 1 / Math.max(zr.w, zr.h);
    const scale = interpolate(effectiveZoom, [0, 1], [1, Math.min(targetScale, 2.2)]);
    const tx = interpolate(effectiveZoom, [0, 1], [0, -(zr.x + zr.w / 2 - 0.5) * 100]);
    const ty = interpolate(effectiveZoom, [0, 1], [0, -(zr.y + zr.h / 2 - 0.5) * 100]);
    imgTransform = `translate(${tx}%, ${ty}%) scale(${scale})`;
  }

  const captionOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Calculate annotation timing — space them across the scene duration
  const annotations = visual.annotations || [];
  const annInterval = annotations.length > 0
    ? Math.floor((durationInFrames - 60) / annotations.length)
    : 0;

  // Scanning spotlight effect — a soft glow that moves across the image
  // when there are no annotations, to show the image is being "read"
  const spotlightX = interpolate(
    frame,
    [20, durationInFrames - 20],
    [20, 80],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const spotlightY = 40 + Math.sin(t * 0.5) * 15;

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
          padding: "50px 80px",
        }}
      >
        {/* Image container */}
        <div
          style={{
            position: "relative",
            width: "88%",
            maxHeight: "74%",
            borderRadius: 14,
            overflow: "hidden",
            border: `2px solid ${colors.border}`,
            boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 60px ${colors.primary}10`,
            opacity: imgSpring,
          }}
        >
          {/* Image with zoom transform */}
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: imgTransform,
              transformOrigin: "center center",
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
          </div>

          {/* Scanning spotlight overlay — subtle moving glow across the image */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse at ${spotlightX}% ${spotlightY}%, ${colors.primary}08 0%, transparent 40%)`,
              pointerEvents: "none",
            }}
          />

          {/* Annotation overlays */}
          {annotations.map((ann, i) => {
            const annStart = 20 + i * annInterval;
            const annSpring = spring({
              frame,
              fps,
              config: springConfigs.snappy,
              delay: annStart,
            });
            const annColor = ann.color || colors.accent;
            const annStyle = (ann as any).style || "label";
            const boxW = (ann as any).w || 0;
            const boxH = (ann as any).h || 0;
            const hasBox = annStyle === "box" && boxW > 0 && boxH > 0;
            const pulseScale = 1 + Math.sin(t * 3.5 - i * 1.5) * 0.05;

            const isCurrentAnn =
              frame >= annStart &&
              (i === annotations.length - 1 || frame < 20 + (i + 1) * annInterval);

            return (
              <div key={i} style={{ opacity: annSpring }}>
                {/* Highlight box — only if w/h specified and style=box */}
                {hasBox && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${(ann.x - boxW / 2) * 100}%`,
                      top: `${(ann.y - boxH / 2) * 100}%`,
                      width: `${boxW * 100}%`,
                      height: `${boxH * 100}%`,
                      border: `2.5px solid ${annColor}${isCurrentAnn ? "cc" : "50"}`,
                      borderRadius: 6,
                      boxShadow: isCurrentAnn
                        ? `0 0 16px ${annColor}30`
                        : "none",
                      transform: `scale(${isCurrentAnn ? pulseScale : 1})`,
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Pointer dot — small circle at the annotation point */}
                {annStyle === "pointer" && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${ann.x * 100}%`,
                      top: `${ann.y * 100}%`,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: annColor,
                      transform: "translate(-50%, -50%)",
                      boxShadow: `0 0 12px ${annColor}80`,
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Label badge — positioned near the annotation point */}
                <div
                  style={{
                    position: "absolute",
                    left: `${ann.x * 100}%`,
                    top: `${ann.y * 100}%`,
                    transform: `translate(-50%, ${hasBox ? `-${boxH * 50 + 110}%` : "-130%"}) scale(${interpolate(annSpring, [0, 1], [0.6, 1])})`,
                    backgroundColor: `${annColor}ee`,
                    color: "#fff",
                    padding: "7px 16px",
                    borderRadius: 7,
                    fontSize: 18,
                    fontFamily: fontFamily.sans,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    boxShadow: `0 3px 12px rgba(0,0,0,0.4)`,
                    pointerEvents: "none",
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
              fontSize: 22,
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: 16,
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
