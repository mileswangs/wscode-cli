import { build } from "esbuild";
import { readFileSync } from "fs";
import { glob } from "glob";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

async function buildProject() {
  try {
    console.log("🚀 Building project with esbuild...");

    await build({
      entryPoints: ["src/main.ts"],
      outfile: "dist/main.js",
      format: "esm",
      platform: "node",
      target: "node18",
      bundle: true,
      minify: true,
      sourcemap: true,
      jsx: "automatic",
      jsxImportSource: "react",
      banner: {
        js: "#!/usr/bin/env node",
      },
    });

    // Make the output file executable
    try {
      const { execSync } = await import("child_process");
      execSync("chmod +x dist/main.js");
      console.log("✅ Made dist/main.js executable");
    } catch (error) {
      console.warn("⚠️  Could not make file executable:", error.message);
    }

    // Show file size
    try {
      const { statSync } = await import("fs");
      const stats = statSync("dist/main.js");
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

      if (stats.size < 1024 * 1024) {
        console.log(`📏 File size: ${fileSizeKB} KB`);
      } else {
        console.log(`📏 File size: ${fileSizeMB} MB (${fileSizeKB} KB)`);
      }
    } catch (error) {
      console.warn("⚠️  Could not get file size:", error.message);
    }

    console.log("✅ Build completed successfully!");
    console.log("📦 Output: dist/main.js");
    console.log(`📊 Version: ${packageJson.version}`);
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

buildProject();
