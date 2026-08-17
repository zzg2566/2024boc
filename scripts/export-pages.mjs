import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const clientDir = resolve(root, "dist", "client");
const outputDir = resolve(root, "pages");
const publicDir = resolve(root, "public");

const restoreTrackedPages = async () => {
  const trackedFiles = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", "HEAD", "pages"],
    { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  for (const relativePath of trackedFiles) {
    const targetPath = resolve(root, relativePath);
    const contents = execFileSync("git", ["show", `HEAD:${relativePath}`], {
      cwd: root,
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
    });
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, contents);
  }
};

const copyPublicAssets = async () => {
  for (const fileName of ["boc-logo.jpg", "favicon.svg", "file.svg", "globe.svg", "og.jpg", "window.svg"]) {
    await cp(resolve(publicDir, fileName), resolve(outputDir, fileName), { force: true });
  }

  const peopleSource = resolve(publicDir, "people");
  const peopleTarget = resolve(outputDir, "people");
  await mkdir(peopleTarget, { recursive: true });
  const people = await readdir(peopleSource, { withFileTypes: true });
  for (const person of people) {
    if (!person.isFile() || !/^youth-\d{2}\.jpg$/i.test(person.name)) continue;
    await cp(resolve(peopleSource, person.name), resolve(peopleTarget, person.name), { force: true });
  }
};

// Fresh builds emit chunk file names with an extra content-hash suffix
// (e.g. "framework-BgSIrAUN-DdcWCAFw.js") while index.html and the tracked
// pages/ directory reference stable names ("framework-BgSIrAUN.js"), and the
// chunks cross-reference each other with the suffixed names. Copy every built
// chunk into pages/ — suffixed names land on their stable counterpart — then
// rewrite all cross references inside the shipped chunks to those names.
const syncClientChunks = async () => {
  const builtChunkDir = resolve(clientDir, "_next", "static", "chunks");
  const pagesChunkDir = resolve(outputDir, "_next", "static", "chunks");
  const stableNames = (await readdir(pagesChunkDir)).filter((f) => f.endsWith(".js"));
  const builtFiles = (await readdir(builtChunkDir)).filter((f) => f.endsWith(".js"));

  const nameMap = new Map();
  for (const file of builtFiles) {
    const stem = file.slice(0, -".js".length);
    const stable = stableNames.find((s) => s === file || stem.startsWith(s.slice(0, -".js".length)));
    nameMap.set(file, stable ?? file);
  }

  for (const [built, target] of nameMap) {
    await cp(resolve(builtChunkDir, built), resolve(pagesChunkDir, target), { force: true });
  }

  // Cache-busting fingerprint: derived from the built file names (they carry
  // content hashes), so any code change produces a new one. Appended as a
  // "?v=" query to every chunk URL — browsers and WeChat WebViews treat it as
  // a new resource and skip their stale cache.
  const buildFingerprint = createHash("sha256")
    .update(builtFiles.slice().sort().join("\n"))
    .digest("hex")
    .slice(0, 12);
  const finalNames = new Set(nameMap.values());

  for (const target of finalNames) {
    const targetPath = resolve(pagesChunkDir, target);
    let contents = await readFile(targetPath, "utf8");
    for (const [built, mapped] of nameMap) {
      if (built !== mapped) contents = contents.replaceAll(built, mapped);
    }
    for (const name of finalNames) {
      contents = contents.replaceAll(name, `${name}?v=${buildFingerprint}`);
    }
    await writeFile(targetPath, contents, "utf8");
  }
  return buildFingerprint;
};

const replaceClientAssets = async (html) => {
  const cssTarget = html.match(/\/2024boc\/(_next\/static\/css\/index\.[^"]+\.css)/)?.[1];
  if (!cssTarget) throw new Error("Unable to find the stable GitHub Pages stylesheet name");

  const cssFiles = (await readdir(resolve(clientDir, "_next", "static", "css")))
    .filter((fileName) => fileName.endsWith(".css"));
  if (cssFiles.length !== 1) throw new Error(`Expected one compiled stylesheet, found ${cssFiles.length}`);
  await cp(
    resolve(clientDir, "_next", "static", "css", cssFiles[0]),
    resolve(outputDir, cssTarget),
    { force: true },
  );
};

// The client runtime preloads dependent chunks from the site root ("/_next/…"),
// which 404s on GitHub Pages because the site lives under "/2024boc/". Rewrite
// the preload manifest inside the index chunk so hydration can finish and the
// page becomes interactive (music toggle, profile navigation, etc.).
const patchIndexChunkBase = async (html) => {
  const indexTarget = html.match(/\/2024boc\/(_next\/static\/chunks\/index-[^"]+\.js)/)?.[1];
  if (!indexTarget) throw new Error("Unable to find the index chunk name");

  const indexPath = resolve(outputDir, indexTarget);
  const source = await readFile(indexPath, "utf8");
  const patched = source.replaceAll('"_next/static/chunks/', '"2024boc/_next/static/chunks/');
  if (patched === source) throw new Error("Index chunk did not contain root-relative preload paths");
  await writeFile(indexPath, patched, "utf8");
};

const updateStaticHtml = (sourceHtml, buildFingerprint) => {
  const names = [
    "张盼", "李思洁", "曹林生", "陈静漪", "胡文祥", "李慢严", "李依", "梁佳", "廖雅晴",
    "刘湘粤", "刘亚彪", "王敏琪", "王智文", "夏清华", "薛子康", "杨庆龄", "杨伊静", "易思佳", "张博英",
  ];

  let html = sourceHtml
    .replace(
      '<main class="page-shell">',
      '<main class="page-shell"><button type="button" class="music-toggle" aria-label="播放轻音乐" aria-pressed="false"><span class="music-disc" aria-hidden="true"><i></i></span><span class="music-label">轻音乐</span></button>',
    )
    .replaceAll("<em>青年学习</em>", "<em>2024届青年员工学习专栏</em>")
    .replace("位青年<br/>待启新章", "位青年<br/>青春之声")
    .replaceAll("助理综服经理", "助理综合服务经理")
    .replace(
      /<div class="profile-visual fit-cover"><img class="profile-photo" src="\.\/people\/youth-01\.jpg" alt="[^"]*" style="object-position:70% 58%"\/>/,
      '<div class="profile-visual photo-landscape fit-cover"><img class="profile-photo-backdrop" src="./people/youth-01.jpg" style="object-position:70% 58%" alt="" aria-hidden="true"/><div class="profile-photo-frame"><img class="profile-photo" src="./people/youth-01.jpg" alt="张盼个人照片" style="object-position:70% 58%"/></div>',
    )
    .replace(
      /<footer class="site-footer">[\s\S]*?<\/footer>/,
      '<footer class="site-footer"><div class="footer-brand"><div><strong>青学笃行｜青年学习</strong><span>中国银行益阳分行团青主题 H5</span></div></div><div class="footer-meta"><p><span>来源</span>中国银行益阳分行团委</p><p><span>编辑</span>曾子刚、杨伊静、张盼、杨庆龄</p><p><span>审核</span>刘娟</p></div></footer>',
    );

  names.forEach((name, index) => {
    const slot = String(index + 1).padStart(2, "0");
    html = html.replace(
      new RegExp(`(<span>${slot}</span><small>)[^<]*(</small>)`),
      `$1${name}$2`,
    );
  });

  // Append the build fingerprint to every static asset URL in the HTML so a
  // new deploy is picked up immediately instead of hitting stale caches.
  return html.replace(
    /(\/2024boc\/_next\/static\/[\w./-]+\.(?:js|css))/g,
    `$1?v=${buildFingerprint}`,
  );
};

await rm(outputDir, { recursive: true, force: true });
await restoreTrackedPages();
await copyPublicAssets();

const originalHtml = await readFile(resolve(outputDir, "index.html"), "utf8");
const buildFingerprint = await syncClientChunks();
await replaceClientAssets(originalHtml);
await patchIndexChunkBase(originalHtml);
const html = updateStaticHtml(originalHtml, buildFingerprint);

await writeFile(resolve(outputDir, "index.html"), html, "utf8");
await writeFile(resolve(outputDir, "404.html"), html, "utf8");
await writeFile(resolve(outputDir, ".nojekyll"), "", "utf8");

console.log(`GitHub Pages export created at ${outputDir}`);
