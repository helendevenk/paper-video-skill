import { defineConfig } from 'vite';
import mc from '@motion-canvas/vite-plugin';

const plugin = (mc as any).default ?? mc;

export default defineConfig({
  plugins: [plugin()],
});
