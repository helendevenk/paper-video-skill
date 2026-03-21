import { Composition } from "remotion";
import { SceneVideo } from "./SceneVideo";
import { SceneVideoPropsSchema } from "./types";

const defaultScene = {
  id: "preview",
  type: "title" as const,
  narration: "预览场景",
  durationHint: 5,
  transition: { type: "fade" as const, durationSeconds: 0.5 },
  audio: null,
  notes: "",
  visual: {
    title: "Paper-to-Video",
    subtitle: "论文解说视频生成器",
    authors: [],
    background: "gradient_dark",
  },
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SceneVideo"
        component={SceneVideo}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={30 * 10}
        schema={SceneVideoPropsSchema}
        defaultProps={{
          scene: defaultScene,
          fps: 30,
        }}
        calculateMetadata={({ props }) => {
          const scene = props.scene;
          const durationSec =
            scene.audio?.durationSeconds ?? scene.durationHint ?? 10;
          return {
            durationInFrames: Math.ceil(durationSec * (props.fps ?? 30)),
            fps: props.fps ?? 30,
            width: 1920,
            height: 1080,
          };
        }}
      />
    </>
  );
};
