/**
 * Asset build pipeline.
 * Reference: esbuild Build API (aligned with project lockfile `esbuild` 0.17.19).
 * Reference: Tailwind CSS JS API 3.4.x processed through PostCSS without spawning external CLI.
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, transform } from "esbuild";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

const require = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = resolve(rootDir, "public", "assets");
const tailwindConfig = require(resolve(rootDir, "tailwind.config.js"));

async function buildStyles() {
  const [tailwindInput, customCss] = await Promise.all([
    readFile(resolve(rootDir, "src", "tailwind.css"), "utf8"),
    readFile(resolve(rootDir, "public", "custom.css"), "utf8"),
  ]);

  const tailwindResult = await postcss([tailwindcss(tailwindConfig)]).process(tailwindInput, {
    from: resolve(rootDir, "src", "tailwind.css"),
  });

  const cssResult = await transform(`${tailwindResult.css}\n${customCss}`, {
    loader: "css",
    minify: true,
    target: "es2019",
  });

  await writeFile(resolve(assetsDir, "styles.css"), cssResult.code, "utf8");
  await rm(resolve(assetsDir, "tailwind.css"), { force: true });
}

async function buildScripts() {
  await build({
    entryPoints: [resolve(rootDir, "src", "app.js")],
    outfile: resolve(assetsDir, "app.js"),
    bundle: true,
    charset: "utf8",
    format: "iife",
    legalComments: "none",
    minify: true,
    platform: "browser",
    sourcemap: false,
    target: ["es2019"],
  });
}

await mkdir(assetsDir, { recursive: true });
await Promise.all([buildStyles(), buildScripts()]);