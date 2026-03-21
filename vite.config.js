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

/** Injected into every built HTML page; Vercel serves `/_vercel/insights/*` once Web Analytics is enabled. */
const vercelWebAnalyticsSnippet = `
    <script>
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    </script>
    <script defer src="/_vercel/insights/script.js"></script>`;

function injectVercelWebAnalytics() {
  return {
    name: "inject-vercel-web-analytics",
    transformIndexHtml(html) {
      return html.replace("</body>", `${vercelWebAnalyticsSnippet}\n  </body>`);
    },
  };
}

export default defineConfig({
  root: __dirname,
  plugins: [injectVercelWebAnalytics()],
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(pages.map((f) => [f.replace(".html", ""), resolve(__dirname, f)])),
    },
  },
});
