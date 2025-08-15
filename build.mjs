import { build } from "esbuild";
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

// Get dependencies to mark as external (if needed)
const dependencies = Object.keys(packageJson.dependencies || {});

async function buildProject() {
  try {
    console.log("🚀 Building project with esbuild...");

    await build({
      // Entry point
      entryPoints: ["src/main.ts"],

      // Output configuration
      bundle: true,
      outfile: "dist/main.js",

      // Platform and format
      platform: "node",
      format: "esm",
      target: "node18",

      // TypeScript and JSX support
      loader: {
        ".ts": "ts",
        ".tsx": "tsx",
        ".js": "js",
        ".jsx": "jsx",
      },

      // Resolve configuration
      resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],

      // Bundle everything into a single file
      // Comment out the external line below if you want to bundle ALL dependencies
      // external: dependencies,

      // Minification (optional - uncomment for production)
      // minify: true,

      // Source maps (optional - useful for debugging)
      sourcemap: false,

      // Tree shaking
      treeShaking: true,

      // Define environment variables
      define: {
        "process.env.NODE_ENV": '"production"',
      },

      // Banner to make the file executable
      banner: {
        js: "#!/usr/bin/env node\n",
      },

      // Metafile for analysis (optional)
      metafile: true,

      // JSX configuration for React
      jsx: "automatic",
      jsxDev: false,

      // Handle Node.js built-ins - only keep Node.js built-ins external, bundle npm packages
      external: [
        // Node.js built-in modules
        "fs",
        "fs/promises",
        "path",
        "os",
        "util",
        "crypto",
        "events",
        "stream",
        "buffer",
        "url",
        "querystring",
        "http",
        "https",
        "net",
        "tls",
        "zlib",
        "child_process",
        "cluster",
        "dgram",
        "dns",
        "domain",
        "module",
        "perf_hooks",
        "process",
        "punycode",
        "readline",
        "repl",
        "string_decoder",
        "timers",
        "tty",
        "v8",
        "vm",
        "worker_threads",
        "assert",
        "constants",
        // Optional development dependencies that shouldn't be bundled
        "react-devtools-core",
      ],
      // Advanced options
      splitting: false, // Must be false for single file output
      chunkNames: "[name]",
      assetNames: "[name]",

      // Log level
      logLevel: "info",
    });

    console.log("✅ Build completed successfully!");
    console.log("📦 Output: dist/main.js");

    // Make the output file executable
    const { chmod } = await import("fs/promises");
    await chmod("dist/main.js", "755");
    console.log("🔧 Made dist/main.js executable");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

// If this file is run directly, execute the build
if (import.meta.url === `file://${process.argv[1]}`) {
  buildProject();
}

export { buildProject };
