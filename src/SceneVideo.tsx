import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TitleScene } from "./scenes/TitleScene";
import { BulletScene } from "./scenes/BulletScene";
import { FigureScene } from "./scenes/FigureScene";
import { CompareScene } from "./scenes/CompareScene";
import { SummaryScene } from "./scenes/SummaryScene";
import { AnimatedCaption } from "./components/AnimatedCaption";
import { ProgressBar } from "./components/ProgressBar";
import { fontFaceCSS } from "./styles/fonts";
import type { SceneVideoProps } from "./types";

export const SceneVideo: React.FC<SceneVideoProps> = ({ scene }) => {
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
      default:
        // Placeholder for unimplemented scene types
        return (
          <AbsoluteFill
            style={{
              backgroundColor: "#1a1a2e",
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

      {/* Scene content */}
      {renderScene()}

      {/* Audio (if available) */}
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
