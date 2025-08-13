import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { ReadFilesTool } from "./read-files";

describe("ReadFilesTool", () => {
  const tool = new ReadFilesTool();
  const testDir = join(process.cwd(), "test-temp");
  const testFile1 = join(testDir, "test1.txt");
  const testFile2 = join(testDir, "test2.txt");

  beforeEach(() => {
    // 创建测试目录和文件
    mkdirSync(testDir, { recursive: true });
    writeFileSync(testFile1, "Hello World\nLine 2");
    writeFileSync(testFile2, "File 2 content\nAnother line");
  });

  afterEach(() => {
    // 清理测试文件
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("Tool Properties", () => {
    it("should have correct name and description", () => {
      expect(tool.name).toBe("read_files");
      expect(tool.description).toContain("Reads the content of multiple files");
    });

    it("should have valid schema", () => {
      expect(tool.schema).toHaveProperty("type", "object");
      expect(tool.schema.properties).toHaveProperty("paths");
      expect(tool.schema.required).toContain("paths");
    });
  });

  describe("validateToolParams", () => {
    it("should validate valid parameters", () => {
      const result = tool.validateToolParams({
        paths: [testFile1, testFile2],
      });
      expect(result).toBeNull();
    });

    it("should validate with encoding parameter", () => {
      const result = tool.validateToolParams({
        paths: [testFile1],
        encoding: "utf8",
      });
      expect(result).toBeNull();
    });

    it("should reject empty paths array", () => {
      const result = tool.validateToolParams({
        paths: [],
      });
      expect(result).toContain("minItems");
    });

    it("should reject missing paths", () => {
      const result = tool.validateToolParams({} as any);
      expect(result).toContain("paths");
    });
  });

  describe("execute", () => {
    it("should read single file successfully", async () => {
      const result = await tool.execute({
        paths: [testFile1],
      });

      expect(result.llmContent).toContain("Read 1 files successfully");
      expect(result.llmContent).toContain("=== FILE: " + testFile1);
      expect(result.llmContent).toContain("Hello World");
      expect(result.llmContent).toContain("Line 2");
    });

    it("should read multiple files successfully", async () => {
      const result = await tool.execute({
        paths: [testFile1, testFile2],
      });

      expect(result.llmContent).toContain("Read 2 files successfully");
      expect(result.llmContent).toContain("=== FILE: " + testFile1);
      expect(result.llmContent).toContain("=== FILE: " + testFile2);
      expect(result.llmContent).toContain("Hello World");
      expect(result.llmContent).toContain("File 2 content");
    });

    it("should handle non-existent files", async () => {
      const nonExistentFile = join(testDir, "non-existent.txt");
      const result = await tool.execute({
        paths: [testFile1, nonExistentFile],
      });

      expect(result.llmContent).toContain(
        "Read 1 files successfully, with 1 errors"
      );
      expect(result.llmContent).toContain("=== ERRORS ===");
      expect(result.llmContent).toContain(nonExistentFile);
    });

    it("should handle directory instead of file", async () => {
      const result = await tool.execute({
        paths: [testDir], // 传入目录而不是文件
      });

      expect(result.llmContent).toContain("with 1 errors");
      expect(result.llmContent).toContain("is not a file");
    });

    it("should throw error for invalid parameters", async () => {
      await expect(tool.execute({ paths: [] } as any)).rejects.toThrow(
        "Invalid parameters for read_files tool"
      );
    });

    it("should use specified encoding", async () => {
      const result = await tool.execute({
        paths: [testFile1],
        encoding: "base64",
      });

      expect(result.llmContent).toContain("Encoding: base64");
      // base64编码的内容应该不包含原始文本
      expect(result.llmContent).not.toContain("Hello World");
    });
  });
});
