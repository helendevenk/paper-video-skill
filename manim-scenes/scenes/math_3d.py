"""Math3DScene — 3D mathematical visualization.

Renders 3D mathematical objects: surfaces, vector fields, geometric shapes.
Scene data passed via SCENE_DATA_PATH environment variable.
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from manim import *
from theme import colors


class Math3DScene(ThreeDScene):
    """3D math visualization — surfaces, vectors, geometry."""

    def construct(self):
        self.camera.background_color = colors['background']

        title = Text(
            "3D Mathematical Visualization",
            font_size=40,
            color=colors['text'],
        )
        title.to_edge(UP)
        self.add_fixed_in_frame_mobjects(title)
        self.play(FadeIn(title), run_time=0.5)

        self.set_camera_orientation(phi=70 * DEGREES, theta=-40 * DEGREES)

        # Default: render a 3D surface
        axes = ThreeDAxes(
            x_range=[-3, 3, 1],
            y_range=[-3, 3, 1],
            z_range=[-2, 2, 1],
        )

        surface = Surface(
            lambda u, v: axes.c2p(u, v, np.sin(u) * np.cos(v)),
            u_range=[-3, 3],
            v_range=[-3, 3],
            resolution=(24, 24),
            fill_opacity=0.6,
        )
        surface.set_fill_by_value(
            axes=axes,
            colorscale=[
                (BLUE, -1),
                (GREEN, 0),
                (YELLOW, 1),
            ],
            axis=2,
        )

        self.play(Create(axes), run_time=1)
        self.play(Create(surface), run_time=2)

        self.begin_ambient_camera_rotation(rate=0.2)
        self.wait(3)
        self.stop_ambient_camera_rotation()

        self.play(FadeOut(surface), FadeOut(axes), FadeOut(title))
