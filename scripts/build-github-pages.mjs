import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputRoot = join(projectRoot, "github-pages-dist");
const publicRoot = join(projectRoot, "public");

await rm(outputRoot, { recursive: true, force: true });
await mkdir(join(outputRoot, "playstudy"), { recursive: true });

let html = await readFile(join(publicRoot, "playstudy", "index.html"), "utf8");
html = html
  .replace('<meta name="playstudy-root" content="/" />', "")
  .replaceAll('href="/manifest.webmanifest"', 'href="./manifest.webmanifest"')
  .replaceAll('href="/playstudy/', 'href="./playstudy/')
  .replaceAll('src="/playstudy/', 'src="./playstudy/');
await writeFile(join(outputRoot, "index.html"), html);

const manifest = JSON.parse(await readFile(join(publicRoot, "manifest.webmanifest"), "utf8"));
manifest.id = "./";
manifest.start_url = "./";
manifest.scope = "./";
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: `.${icon.src}`,
}));
delete manifest.share_target;
await writeFile(join(outputRoot, "manifest.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`);

await cp(join(publicRoot, "sw.js"), join(outputRoot, "sw.js"));
await cp(join(publicRoot, "playstudy", "app.js"), join(outputRoot, "playstudy", "app.js"));
await cp(join(publicRoot, "playstudy", "styles.css"), join(outputRoot, "playstudy", "styles.css"));
await cp(join(publicRoot, "playstudy", "icons"), join(outputRoot, "playstudy", "icons"), { recursive: true });
await writeFile(join(outputRoot, ".nojekyll"), "");

console.log(`GitHub Pages bundle ready: ${outputRoot}`);
