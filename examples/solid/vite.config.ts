import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
  },
  build: {
    target: "esnext",
  },
});
