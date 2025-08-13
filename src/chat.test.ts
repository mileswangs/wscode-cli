import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import path from "path";
import fs from "fs";
import { Chat } from "./chat";

// Mock OpenAI to avoid real API calls during testing
const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      responses: {
        create: mockCreate,
      },
    })),
  };
});

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
    console.log(`Test running in: ${process.cwd()}`);

    // Reset mock with default successful response
    mockCreate.mockResolvedValue({
      id: "test-response",
      created_at: Date.now(),
      output: [
        {
          role: "assistant",
          content:
            "I can help you with your project files. What would you like me to do?",
        },
      ] as any,
      output_text: "Test response",
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    // Create new chat instance for each test
    chat = new Chat();
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Ensure we're back to original directory
    process.chdir(originalCwd);
  });

  it("should initialize chat with system prompt", () => {
    const history = chat.getHistory();

    expect(history).toHaveLength(1);
    // Type assertion needed for system message
    const systemMessage = history[0] as any;
    expect(systemMessage.role).toBe("system");
    expect(systemMessage.content).toContain("You are an interactive CLI agent");
  });

  it("should work in test project directory", () => {
    // Verify we're in the correct directory
    expect(process.cwd()).toBe(testProjectPath);

    // Verify test files exist
    expect(fs.existsSync("package.json")).toBe(true);
    expect(fs.existsSync("index.js")).toBe(true);
    expect(fs.existsSync("src/utils.ts")).toBe(true);
    expect(fs.existsSync("tests/api.test.js")).toBe(true);
    expect(fs.existsSync("README.md")).toBe(true);
  });

  it("should add user messages to history", async () => {
    const testPrompt = "List all JavaScript files in this project";

    await chat.sendPrompt(testPrompt);

    const history = chat.getHistory();

    // Should have system prompt + user message + assistant response
    expect(history.length).toBeGreaterThanOrEqual(3);

    // Find user message in history
    const userMessage = history.find((msg: any) => msg.role === "user") as any;
    expect(userMessage?.content).toBe(testPrompt);
  });

  it("should handle responses correctly when working in test project", async () => {
    const testPrompt = "Show me the package.json file";

    const response = await chat.sendPrompt(testPrompt);

    expect(response).toBeDefined();
    expect(Array.isArray(response)).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-4.1",
        input: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({ role: "user", content: testPrompt }),
        ]),
      })
    );
  });

  it("should handle tool calls correctly when working in test project", async () => {
    // First response: assistant with tool call
    // Second response: assistant with final answer
    mockCreate
      .mockResolvedValueOnce({
        id: "test-response-1",
        created_at: Date.now(),
        output: [
          {
            type: "function_call",
            name: "ls",
            call_id: "call_123",
            arguments: JSON.stringify({ path: "." }),
          },
        ] as any,
        output_text: "Tool call response",
        usage: { input_tokens: 10, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        id: "test-response-2",
        created_at: Date.now(),
        output: [
          {
            role: "assistant",
            content: "I found the following files in your project directory.",
          },
        ] as any,
        output_text: "Final response",
        usage: { input_tokens: 15, output_tokens: 25 },
      });

    const testPrompt = "List files in current directory";
    const response = await chat.sendPrompt(testPrompt);

    // Verify tool was called and response was generated
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(response).toBeDefined();

    // Check that tool call result was added to history
    const history = chat.getHistory();
    const toolOutput = history.find(
      (msg: any) => msg.type === "function_call_output"
    );
    expect(toolOutput).toBeDefined();
  });

  it("should clear history correctly", () => {
    chat.clearHistory();

    const history = chat.getHistory();
    expect(history).toHaveLength(0);
  });

  it("should handle invalid tool calls gracefully", async () => {
    // Mock response with invalid tool call
    mockCreate.mockResolvedValueOnce({
      id: "test-response-error",
      created_at: Date.now(),
      output: [
        {
          type: "function_call",
          name: "nonexistent_tool",
          call_id: "call_456",
          arguments: JSON.stringify({ param: "value" }),
        },
      ] as any,
      output_text: "Error response",
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    const testPrompt = "Use a nonexistent tool";

    await expect(chat.sendPrompt(testPrompt)).rejects.toThrow(
      "Tool nonexistent_tool not found"
    );
  });

  it("should handle malformed tool arguments", async () => {
    // Mock response with invalid JSON in tool arguments
    mockCreate.mockResolvedValueOnce({
      id: "test-response-malformed",
      created_at: Date.now(),
      output: [
        {
          type: "function_call",
          name: "ls",
          call_id: "call_789",
          arguments: "invalid json",
        },
      ] as any,
      output_text: "Malformed response",
      usage: { input_tokens: 10, output_tokens: 20 },
    });

    const testPrompt = "Use tool with bad arguments";

    await expect(chat.sendPrompt(testPrompt)).rejects.toThrow(
      "Invalid JSON in tool arguments"
    );
  });

  it("should preserve working directory context across multiple interactions", async () => {
    // Verify we start in test project
    expect(process.cwd()).toBe(testProjectPath);

    // First interaction
    await chat.sendPrompt("First message");
    expect(process.cwd()).toBe(testProjectPath);

    // Second interaction
    await chat.sendPrompt("Second message");
    expect(process.cwd()).toBe(testProjectPath);

    // Working directory should remain stable
    expect(process.cwd()).toBe(testProjectPath);
  });

  it("should handle no response from LLM", async () => {
    // Mock response with no output
    mockCreate.mockResolvedValueOnce({
      id: "test-response-empty",
      created_at: Date.now(),
      output: null,
      output_text: "",
      usage: { input_tokens: 10, output_tokens: 0 },
    });

    const testPrompt = "Test empty response";

    await expect(chat.sendPrompt(testPrompt)).rejects.toThrow(
      "No response from LLM"
    );
  });

  it("should correctly use tools with test project files", async () => {
    // Mock a tool call that would read package.json
    mockCreate
      .mockResolvedValueOnce({
        id: "test-response-read",
        created_at: Date.now(),
        output: [
          {
            type: "function_call",
            name: "read-file",
            call_id: "call_read",
            arguments: JSON.stringify({
              file_path: path.join(testProjectPath, "package.json"),
            }),
          },
        ] as any,
        output_text: "Reading file",
        usage: { input_tokens: 10, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        id: "test-response-final",
        created_at: Date.now(),
        output: [
          {
            role: "assistant",
            content: "Here is the content of your package.json file.",
          },
        ] as any,
        output_text: "File content displayed",
        usage: { input_tokens: 20, output_tokens: 30 },
      });

    const testPrompt = "Read the package.json file";
    const response = await chat.sendPrompt(testPrompt);

    // Verify the tool call was processed
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(response).toBeDefined();

    // Check that the file actually exists in our test directory
    const packageJsonPath = path.join(testProjectPath, "package.json");
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    // Verify the content is what we expect
    const packageContent = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf-8")
    );
    expect(packageContent.name).toBe("test-project");
  });

  it("should work with different file types in test project", () => {
    // Verify we have different file types for testing
    expect(fs.existsSync("package.json")).toBe(true); // JSON
    expect(fs.existsSync("index.js")).toBe(true); // JavaScript
    expect(fs.existsSync("src/utils.ts")).toBe(true); // TypeScript
    expect(fs.existsSync("tests/api.test.js")).toBe(true); // Test file
    expect(fs.existsSync("README.md")).toBe(true); // Markdown

    // Verify directory structure
    expect(fs.statSync("src").isDirectory()).toBe(true);
    expect(fs.statSync("tests").isDirectory()).toBe(true);
  });
});
