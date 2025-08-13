import { Chat } from "./chat";
import { config } from "dotenv";

// 加载环境变量
config();

async function main() {
  console.log("Gemini CLI Copy - Starting...");
  console.log("Node.js version:", process.version);
  console.log("Current working directory:", process.cwd());

  // 检查是否有 OpenAI API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set");
    console.error("Please create a .env file with your OpenAI API key");
    process.exit(1);
  }

  // 创建Chat实例
  const chat = new Chat();

  // 添加系统消息
  chat.addSystemMessage(`You are a helpful AI assistant with access to file system tools. 
You can read files, list directories, and help users with various tasks. 
Available tools: ${chat.getAvailableTools().join(", ")}`);

  console.log("Available tools:", chat.getAvailableTools());

  // 示例对话
  if (process.argv.length > 2) {
    const userPrompt = process.argv.slice(2).join(" ");
    console.log("\nUser:", userPrompt);

    try {
      const response = await chat.sendPrompt(userPrompt);
      console.log("\nAssistant:", response);
    } catch (error) {
      console.error("Error:", error);
    }
  } else {
    console.log('\nUsage: pnpm dev "your prompt here"');
    console.log('Example: pnpm dev "List the files in the current directory"');
    console.log('Example: pnpm dev "Read the package.json file"');
  }
}

main().catch(console.error);
