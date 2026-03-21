"""Manim spike test — verify rendering to MP4."""

from manim import *


class SpikeScene(ThreeDScene):
    def construct(self):
        # Background color matching theme
        self.camera.background_color = "#0f172a"

        # Simple 3D object
        cube = Cube(side_length=2, fill_opacity=0.7, fill_color="#3b82f6")
        cube.set_stroke(color="#8b5cf6", width=2)

        title = Text("Manim 3D Spike", font_size=48, color="#f1f5f9")
        title.to_edge(UP)

        self.add_fixed_in_frame_mobjects(title)
        self.play(FadeIn(title))

        self.play(Create(cube))
        self.move_camera(phi=75 * DEGREES, theta=-45 * DEGREES, run_time=2)
        self.play(Rotate(cube, angle=PI, axis=UP), run_time=2)

        self.wait(1)
        self.play(FadeOut(cube), FadeOut(title))
