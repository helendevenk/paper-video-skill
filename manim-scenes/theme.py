"""Theme loader for Manim scenes — reads theme.json for cross-engine consistency."""

import json
import os

_theme_path = os.path.join(os.path.dirname(__file__), '..', 'theme.json')

with open(_theme_path) as f:
    _theme = json.load(f)

colors = _theme['colors']
fonts = _theme['fonts']
spacing = _theme['spacing']
animation = _theme['animation']
canvas = _theme['canvas']
