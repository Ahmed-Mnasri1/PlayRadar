import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the API runs on :3001 and Vite proxies /api to it.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target: "http://localhost:3001", changeOrigin: true } } },
  // Vitest (npm test -w client): components run in a simulated browser (jsdom).
  test: { environment: "jsdom", include: ["src/**/*.test.{js,jsx}"] },
  build: {
    rollupOptions: {
      output: {
        // React + router change rarely: a separate chunk stays cached between deploys.
        manualChunks: { vendor: ["react", "react-dom", "react-router-dom"] },
      },
    },
  },
});
