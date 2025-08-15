import { build } from "esbuild";

async function buildApp() {
  try {
    await build({
      entryPoints: ["src/main.ts"],
      bundle: true,
      platform: "node",
      target: "node18",
      format: "esm",
      outfile: "dist/main.js",
      external: [
        // Node.js built-ins
        "fs",
        "path",
        "os",
        "util",
        // Keep external dependencies as external
        "ink",
        "react",
        "openai",
        "glob",
        "ajv",
        "dotenv",
      ],
      minify: false,
      sourcemap: true,
      jsx: "automatic",
      jsxImportSource: "react",
      banner: {
        js: "#!/usr/bin/env node\n",
      },
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    });

    console.log("✅ Build completed successfully!");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

buildApp();
