import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TitleScene } from "./scenes/TitleScene";
import { BulletScene } from "./scenes/BulletScene";
import { FigureScene } from "./scenes/FigureScene";
import { CompareScene } from "./scenes/CompareScene";
import { SummaryScene } from "./scenes/SummaryScene";
import { FormulaScene } from "./scenes/FormulaScene";
import { CodeScene } from "./scenes/CodeScene";
import { AnimatedCaption } from "./components/AnimatedCaption";
import { ProgressBar } from "./components/ProgressBar";
import { fontFaceCSS } from "./styles/fonts";
import type { SceneVideoProps } from "./types";

export const SceneVideo: React.FC<SceneVideoProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Scene fade-in/fade-out transition
  const fadeFrames = 12;
  const fadeIn = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  const renderScene = () => {
    switch (scene.type) {
      case "title":
        return <TitleScene visual={scene.visual as any} />;
      case "bullet":
        return <BulletScene visual={scene.visual as any} />;
      case "figure":
        return <FigureScene visual={scene.visual as any} />;
      case "compare":
        return <CompareScene visual={scene.visual as any} />;
      case "summary":
        return <SummaryScene visual={scene.visual as any} />;
      case "formula":
      case "formula_derive":
        return <FormulaScene visual={scene.visual as any} />;
      case "code":
        return <CodeScene visual={scene.visual as any} />;
      default:
        return (
          <AbsoluteFill
            style={{
              backgroundColor: "#0f0f1a",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#e0e0e0",
              fontSize: 48,
              fontFamily: "sans-serif",
            }}
          >
            {scene.type}: {scene.id}
          </AbsoluteFill>
        );
    }
  };

  const wordTimestamps = scene.audio?.wordTimestamps ?? [];

  return (
    <AbsoluteFill>
      {/* Load fonts */}
      <style dangerouslySetInnerHTML={{ __html: fontFaceCSS }} />

      {/* Scene content with fade transition */}
      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        {renderScene()}
      </AbsoluteFill>

      {/* Audio */}
      {scene.audio?.file && <Audio src={scene.audio.file} />}

      {/* Captions */}
      {wordTimestamps.length > 0 && (
        <AnimatedCaption wordTimestamps={wordTimestamps} />
      )}

      {/* Progress bar */}
      <ProgressBar />
    </AbsoluteFill>
  );
};
