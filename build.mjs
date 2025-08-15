import { build } from "esbuild";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

async function buildProject() {
  try {
    console.log("🚀 Building project with esbuild...");

    await build({
      entryPoints: ["src/main.ts"],
      bundle: true,
      platform: "node",
      target: "node18",
      format: "esm",
      outfile: "dist/main.js",
      external: [
        // Only keep Node.js built-ins as external
        // All npm packages will be bundled
      ],
      minify: true,
      sourcemap: true,
      splitting: false,
      treeShaking: true,
      banner: {
        js: "#!/usr/bin/env node",
      },
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      jsx: "automatic",
      jsxImportSource: "react",
      loader: {
        ".ts": "ts",
        ".tsx": "tsx",
      },
      resolveExtensions: [".tsx", ".ts", ".jsx", ".js"],
      logLevel: "info",
      // Handle node modules properly
      packages: "bundle",
      // Ensure proper resolution
      conditions: ["import", "module", "default"],
    });

    // Make the output file executable
    try {
      const { execSync } = await import("child_process");
      execSync("chmod +x dist/main.js");
      console.log("✅ Made dist/main.js executable");
    } catch (error) {
      console.warn("⚠️  Could not make file executable:", error.message);
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
