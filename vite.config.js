import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const pages = [
  "index.html",
  "join.html",
  "bingo.html",
  "player.html",
  "cards.html",
  "spectator.html",
  "privacy.html",
  "terms.html",
  "admin-translations.html",
];

export default defineConfig({
  root: __dirname,
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(pages.map((f) => [f.replace(".html", ""), resolve(__dirname, f)])),
    },
  },
});
