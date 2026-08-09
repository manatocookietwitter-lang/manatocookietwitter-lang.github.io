import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const client = new URL("../dist/client/", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
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
}

test("opens PlayStudy directly at the site root", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /id="app"/);
  assert.match(html, /href="\/playstudy\/styles\.css\?v=10"/);
  assert.match(html, /href="\/manifest\.webmanifest"/);
  assert.doesNotMatch(html, /\/playstudy\/index\.html[^"']*redirect/i);
});

test("ships a root-scoped landscape PWA and a legacy worker recovery", async () => {
  const [manifestText, rootWorker, legacyWorker, appScript, styles, pageSource] = await Promise.all([
    readFile(new URL("manifest.webmanifest", client), "utf8"),
    readFile(new URL("sw.js", client), "utf8"),
    readFile(new URL("playstudy/sw.js", client), "utf8"),
    readFile(new URL("playstudy/app.js", client), "utf8"),
    readFile(new URL("playstudy/styles.css", client), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.orientation, "landscape");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.prefer_related_applications, false);

  assert.match(appScript, /document\.querySelector\('meta\[name="playstudy-root"\]'\)/);
  assert.match(appScript, /navigator\.serviceWorker\.register/);
  assert.match(appScript, /id="install-app"/);
  assert.match(appScript, /id="install-guide"/);
  assert.match(appScript, /id="install-copy"/);
  assert.match(appScript, /\$\('#install-guide'\)\?\.showModal\(\)/);
  assert.doesNotMatch(appScript, /\(state\.canInstall\|\|iosInstallCandidate\(\)\)\?[^:]+:''/);
  assert.match(rootWorker, /playstudy-shell-v10/);
  assert.match(rootWorker, /const SCOPE_PATH = new URL\(self\.registration\.scope\)/);
  assert.match(rootWorker, /const isCoreAsset = APP_SHELL\.includes\(url\.pathname\)/);
  assert.match(rootWorker, /new Response\(/);
  assert.match(legacyWorker, /registration\.unregister\(\)/);
  assert.match(legacyWorker, /client\.navigate\('\/'\)/);
  assert.match(pageSource, /useEffect\(\(\) =>/);
  assert.match(pageSource, /document\.createElement\("script"\)/);
  assert.match(pageSource, /__playStudyInstallPrompt/);
  assert.match(pageSource, /script\.src = "\/playstudy\/app\.js\?v=10"/);
  assert.match(pageSource, /href="\/playstudy\/styles\.css\?v=10"/);
  assert.doesNotMatch(appScript, /navigator\.share/);
  assert.match(appScript, /標準ブラウザで追加する/);
  assert.match(appScript, /requestVideoFrameCallback/);
  assert.match(appScript, /document\.body\.classList\.toggle\('player-active'/);
  assert.match(styles, /html\.player-active,body\.player-active/);
  assert.match(styles, /grid-template-rows:minmax\(0,1fr\) 50px 48px/);
  assert.doesNotMatch(pageSource, /redirect\(/);
  assert.doesNotMatch(pageSource, /<script[^>]+src=/);
});
