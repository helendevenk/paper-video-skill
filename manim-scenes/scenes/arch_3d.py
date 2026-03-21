"""Arch3DScene — 3D neural network architecture visualization."""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from manim import *
from theme import colors


class Arch3DScene(ThreeDScene):
    """3D neural network layers visualization.

    Renders stacked rectangular prisms representing network layers
    with connections between them.
    """

    def construct(self):
        self.camera.background_color = colors['background']

        # Default layers (can be overridden by scene data)
        layers_data = [
            {"name": "Embedding", "type": "dense", "size": [3, 2, 0.3], "color": colors['primary']},
            {"name": "Attention", "type": "attention", "size": [3, 3, 1], "color": colors['secondary']},
            {"name": "FFN", "type": "dense", "size": [3, 2, 0.5], "color": colors['accent']},
            {"name": "Norm", "type": "norm", "size": [3, 2, 0.2], "color": colors['highlight']},
            {"name": "Output", "type": "dense", "size": [3, 1, 0.3], "color": colors['primary']},
        ]

        # Try to load scene data from environment
        scene_data_path = os.environ.get('SCENE_DATA_PATH')
        if scene_data_path and os.path.exists(scene_data_path):
            with open(scene_data_path) as f:
                data = json.load(f)
                if 'visual' in data and 'layers' in data['visual']:
                    layers_data = data['visual']['layers']

        # Title
        title = Text(
            "Neural Network Architecture",
            font_size=40,
            color=colors['text'],
        )
        title.to_edge(UP)
        self.add_fixed_in_frame_mobjects(title)
        self.play(FadeIn(title), run_time=0.5)

        # Set camera angle
        self.set_camera_orientation(
            phi=70 * DEGREES,
            theta=-40 * DEGREES,
        )

        # Create 3D layer blocks
        layer_mobjects = []
        layer_labels = []
        spacing_z = 2.5
        total_height = (len(layers_data) - 1) * spacing_z
        start_z = total_height / 2

        for i, layer in enumerate(layers_data):
            w, h, d = layer.get('size', [3, 2, 0.5])
            color = layer.get('color', colors['primary'])

            prism = Prism(
                dimensions=[w, d, h],
                fill_opacity=0.6,
                fill_color=color,
                stroke_width=1,
                stroke_color=WHITE,
            )
            prism.move_to([0, 0, start_z - i * spacing_z])

            label = Text(
                layer.get('name', f'Layer {i}'),
                font_size=24,
                color=colors['text'],
            )
            label.next_to(prism, RIGHT, buff=0.5)

            layer_mobjects.append(prism)
            layer_labels.append(label)

        # Animate layers appearing one by one
        for i, (prism, label) in enumerate(zip(layer_mobjects, layer_labels)):
            self.add_fixed_orientation_mobjects(label)
            self.play(
                Create(prism),
                FadeIn(label),
                run_time=0.6,
            )

            # Add connection arrow to previous layer
            if i > 0:
                prev = layer_mobjects[i - 1]
                arrow = Arrow3D(
                    start=prev.get_center() + DOWN * 0.3,
                    end=prism.get_center() + UP * 0.3,
                    color=colors['textMuted'],
                )
                self.play(Create(arrow), run_time=0.3)

        # Rotate camera around the structure
        self.begin_ambient_camera_rotation(rate=0.3)
        self.wait(3)
        self.stop_ambient_camera_rotation()

        # Fade out
        self.play(
            *[FadeOut(m) for m in layer_mobjects],
            *[FadeOut(l) for l in layer_labels],
            FadeOut(title),
            run_time=1,
        )
