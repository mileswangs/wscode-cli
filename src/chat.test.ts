import { describe, it, expect, beforeEach, vi } from "vitest";
import { Chat } from "./chat";

// Mock OpenAI
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

describe("Chat", () => {
  let chat: Chat;

  beforeEach(() => {
    // Mock environment variable
    process.env.OPENAI_API_KEY = "test-key";
    chat = new Chat();
  });

  describe("constructor", () => {
    it("should initialize with empty history", () => {
      expect(chat.getHistory()).toHaveLength(0);
    });

    it("should have available tools", () => {
      const tools = chat.getAvailableTools();
      expect(tools).toContain("list_directory");
      expect(tools).toContain("read_files");
    });
  });

  describe("addSystemMessage", () => {
    it("should add system message to beginning of history", () => {
      chat.addSystemMessage("You are a helpful assistant");
      const history = chat.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].role).toBe("system");
      expect(history[0].content).toBe("You are a helpful assistant");
    });

    it("should add system message before other messages", () => {
      // 先添加用户消息
      chat.getHistory().push({ role: "user", content: "Hello" });

      // 再添加系统消息
      chat.addSystemMessage("System prompt");

      const history = chat.getHistory();
      expect(history[0].role).toBe("system");
      expect(history[1].role).toBe("user");
    });
  });

  describe("getHistory and clearHistory", () => {
    it("should return copy of history", () => {
      chat.addSystemMessage("Test");
      const history1 = chat.getHistory();
      const history2 = chat.getHistory();

      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2); // 应该是不同的对象
    });

    it("should clear history", () => {
      chat.addSystemMessage("Test");
      expect(chat.getHistory()).toHaveLength(1);

      chat.clearHistory();
      expect(chat.getHistory()).toHaveLength(0);
    });
  });

  describe("getAvailableTools", () => {
    it("should return list of available tools", () => {
      const tools = chat.getAvailableTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  // Note: sendPrompt method would require more complex mocking of OpenAI responses
  // and is better tested in integration tests with actual API calls
});
