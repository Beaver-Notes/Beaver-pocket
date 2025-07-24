import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Define __dirname and PACKAGE_ROOT for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = __dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@/": path.join(PACKAGE_ROOT, "src") + "/",
    },
  },
  plugins: [react()],

  optimizeDeps: {
    exclude: ["ssh2", "cpu-features"],
  },

  ssr: {
    noExternal: ["ssh2", "cpu-features"],
  },
});
