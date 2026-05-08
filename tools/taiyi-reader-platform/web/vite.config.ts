import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5179,
    proxy: {
      "/taiyi-api": {
        target: "http://127.0.0.1:3450",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/taiyi-api/, "") || "/",
      },
    },
  },
});
