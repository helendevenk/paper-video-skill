import { makeProject } from '@motion-canvas/core';

import spikeScene from './scenes/spike?scene';
import codeDiffScene from './scenes/code-diff?scene';
import formulaDeriveScene from './scenes/formula-derive?scene';
import algorithmScene from './scenes/algorithm?scene';
import flowchartScene from './scenes/flowchart?scene';

export default makeProject({
  scenes: [
    spikeScene,
    codeDiffScene,
    formulaDeriveScene,
    algorithmScene,
    flowchartScene,
  ],
});
