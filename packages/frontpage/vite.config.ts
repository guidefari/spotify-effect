import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

const port = 4177;

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port,
    strictPort: true,
  },
  preview: {
    port,
    strictPort: true,
  },
});
