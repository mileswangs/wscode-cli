import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import path from "path";
import fs from "fs";
import { Chat } from "./chat";

describe("Chat Module Integration Tests", () => {
  const originalCwd = process.cwd();
  const testProjectPath = path.join(__dirname, "../test_project");
  let chat: Chat;

  beforeAll(() => {
    // Ensure test project exists with required files
    if (!fs.existsSync(testProjectPath)) {
      throw new Error(
        "Test project directory not found. Please run setup first."
      );
    }
  });

  beforeEach(() => {
    // Change to test project directory to simulate CLI usage
    process.chdir(testProjectPath);
    console.log(`🔄 Test running in: ${process.cwd()}`);

    // Create new chat instance for each test
    chat = new Chat();
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);
  });

  afterAll(() => {
    // Ensure we're back to original directory
    process.chdir(originalCwd);
    console.log(`✅ All tests completed, back to: ${process.cwd()}`);
  });

  it("should initialize chat and work in test project directory", () => {
    // Basic setup verification
    expect(process.cwd()).toBe(testProjectPath);
    expect(fs.existsSync("package.json")).toBe(true);
    expect(fs.existsSync("index.js")).toBe(true);
    expect(fs.existsSync("src/utils.ts")).toBe(true);
    expect(chat).toBeDefined();

    console.log("✅ Chat initialized successfully in test project");
  });

  // Real chat tests - these will make actual API calls
  // Remove .skip to run them (requires OPENROUTER_KEY)
  it("should list JavaScript files in the project", async () => {
    console.log("🚀 Testing: List JavaScript files");

    const response = await chat.sendPrompt(
      "List all JavaScript files in this project"
    );

    console.log("📝 Chat response:", response);
    console.log("📚 Chat history length:", chat.getHistory().length);
  }, 30000); // 30 second timeout

  it.skip("should read package.json content", async () => {
    console.log("🚀 Testing: Read package.json");

    const response = await chat.sendPrompt(
      "Read the package.json file and show me its content"
    );

    console.log("📝 Chat response:", response);
    console.log("📚 Chat history length:", chat.getHistory().length);
  }, 30000);

  it.skip("should find TypeScript files", async () => {
    console.log("🚀 Testing: Find TypeScript files");

    const response = await chat.sendPrompt(
      "Find all TypeScript files in this project"
    );

    console.log("📝 Chat response:", response);
    console.log("📚 Chat history length:", chat.getHistory().length);
  }, 30000);

  it.skip("should search for specific text in files", async () => {
    console.log("🚀 Testing: Search for text");

    const response = await chat.sendPrompt(
      'Search for the word "express" in all files'
    );

    console.log("📝 Chat response:", response);
    console.log("📚 Chat history length:", chat.getHistory().length);
  }, 30000);

  it.skip("should create a new file", async () => {
    console.log("🚀 Testing: Create new file");

    const beforeFiles = fs.readdirSync(".");
    console.log("📁 Files before:", beforeFiles);

    const response = await chat.sendPrompt(
      'Create a new file called "test-output.txt" with the content "Hello from chat test!"'
    );

    console.log("📝 Chat response:", response);

    const afterFiles = fs.readdirSync(".");
    console.log("📁 Files after:", afterFiles);

    // Check if file was created (manual verification)
    if (fs.existsSync("test-output.txt")) {
      console.log("✅ File created successfully!");
      console.log(
        "📄 File content:",
        fs.readFileSync("test-output.txt", "utf-8")
      );

      // Clean up
      fs.unlinkSync("test-output.txt");
      console.log("🧹 Test file cleaned up");
    } else {
      console.log("❌ File was not created");
    }
  }, 30000);

  it.skip("should analyze project structure", async () => {
    console.log("🚀 Testing: Analyze project structure");

    const response = await chat.sendPrompt(
      "Analyze this project structure and tell me what kind of project this is"
    );

    console.log("📝 Chat response:", response);
    console.log("📚 Chat history length:", chat.getHistory().length);
  }, 30000);

  // Manual test runner - uncomment to run specific prompts
  it.skip("manual test runner", async () => {
    console.log("🧪 Manual Test Runner - Customize your prompt here");

    // Customize this prompt to test whatever you want
    const customPrompt =
      "List all files and show me the structure of this project";

    console.log(`🚀 Testing custom prompt: "${customPrompt}"`);

    const response = await chat.sendPrompt(customPrompt);

    console.log("📝 Chat response:", response);
    console.log("📚 Final chat history length:", chat.getHistory().length);

    // Show current working directory and files for verification
    console.log("📍 Current working directory:", process.cwd());
    console.log("📁 Current files:", fs.readdirSync("."));
  }, 60000); // 60 second timeout for complex operations

  it("should preserve working directory across tests", () => {
    expect(process.cwd()).toBe(testProjectPath);
    console.log("✅ Working directory preserved correctly");
  });
});
