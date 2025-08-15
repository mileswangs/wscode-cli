import { build } from "esbuild";

async function buildProject() {
  try {
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
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      banner: {
        js: "#!/usr/bin/env node\nimport { createRequire } from 'module';\nconst require = createRequire(import.meta.url);",
      },
    });

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
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

buildProject();
