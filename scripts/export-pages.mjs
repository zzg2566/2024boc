import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const clientDir = resolve(root, "dist", "client");
const outputDir = resolve(root, "pages");
const repositoryBase = "/2024boc";
const pageOrigin = "https://zzg2566.github.io";

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(clientDir, outputDir, { recursive: true });

const { default: worker } = await import("../dist/server/index.js");
const response = await worker.fetch(
  new Request(`${pageOrigin}/`, {
    headers: { accept: "text/html" },
  }),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Static render failed with status ${response.status}`);
}

let html = await response.text();
html = html
  .replaceAll("/_next/", `${repositoryBase}/_next/`)
  .replaceAll("/boc-logo.jpg", `${repositoryBase}/boc-logo.jpg`)
  .replaceAll(`${pageOrigin}/og.jpg`, `${pageOrigin}${repositoryBase}/og.jpg`);

const socialImage = `${pageOrigin}${repositoryBase}/og.jpg`;
const socialMeta = [
  `<meta property="og:url" content="${pageOrigin}${repositoryBase}/"/>`,
  `<meta property="og:image" content="${socialImage}"/>`,
  `<meta property="og:image:width" content="1200"/>`,
  `<meta property="og:image:height" content="800"/>`,
  `<meta name="twitter:image" content="${socialImage}"/>`,
].join("");
html = html.replace("</head>", `${socialMeta}</head>`);

await writeFile(resolve(outputDir, "index.html"), html, "utf8");
await writeFile(resolve(outputDir, "404.html"), html, "utf8");
await writeFile(resolve(outputDir, ".nojekyll"), "", "utf8");

console.log(`GitHub Pages export created at ${outputDir}`);
