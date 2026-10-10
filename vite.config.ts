import netlify from "@netlify/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The Netlify plugin runs the Functions and a local Netlify Database during `vite dev`.
// Edge Functions are not used by this project, so their (Deno-based) emulator is off.
export default defineConfig({
  plugins: [react(), netlify({ edgeFunctions: { enabled: false } })],
});
