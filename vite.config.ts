import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  // noVNC 1.7 ships top-level await, which esbuild's default prebundle
  // target (es2020) rejects. WebView2 is Chromium, so esnext is safe here.
  optimizeDeps: {
    esbuildOptions: { target: "esnext", supported: { "top-level-await": true } },
  },
  esbuild: { target: "esnext" },
  build: { target: "esnext", minify: "esbuild", sourcemap: false },
});
