import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { devApi } from "./dev-api.ts";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), devApi(mode)],
  server: {
    watch: {
      ignored: ["**/qa/**", "**/test-results/**", "**/tests/**", "**/*.md"],
    },
  },
}));
