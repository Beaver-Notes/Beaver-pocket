import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    exclude: ["ssh2", "cpu-features"],
  },

  ssr: {
    noExternal: ["ssh2", "cpu-features"],
  },
});
