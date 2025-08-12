console.log("Hello from TypeScript with tsx!");

// 示例：使用ES模块导入
import { readFileSync } from "fs";
import { join } from "path";

function main() {
  console.log("Node.js version:", process.version);
  console.log("Current working directory:", process.cwd());

  // 示例TypeScript功能
  interface Config {
    name: string;
    version: string;
  }

  const config: Config = {
    name: "gemini-cli-copy",
    version: "1.0.0",
  };

  console.log("Project config:", config);
}

main();
