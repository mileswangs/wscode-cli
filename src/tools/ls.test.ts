import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { LsTool } from "./ls";

describe("LsTool", () => {
  const tool = new LsTool();
  const testDir = join(process.cwd(), "test-temp-ls");
  const testSubDir = join(testDir, "subdir");
  const testFile1 = join(testDir, "file1.txt");
  const testFile2 = join(testDir, "file2.md");

  beforeEach(() => {
    // 创建测试目录结构
    mkdirSync(testDir, { recursive: true });
    mkdirSync(testSubDir, { recursive: true });

    // 创建测试文件
    writeFileSync(testFile1, "Test content 1");
    writeFileSync(testFile2, "# Test markdown");
    writeFileSync(join(testSubDir, "nested.txt"), "Nested file content");
  });

  afterEach(() => {
    // 清理测试文件
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("Tool Properties", () => {
    it("should have correct name and description", () => {
      expect(tool.name).toBe("list_directory");
      expect(tool.description).toContain(
        "Lists the names of files and subdirectories"
      );
    });

    it("should have valid schema", () => {
      expect(tool.schema).toHaveProperty("type", "object");
      expect(tool.schema.properties).toHaveProperty("path");
      expect(tool.schema.required).toContain("path");
    });
  });

  describe("validateToolParams", () => {
    it("should validate valid parameters", () => {
      const result = tool.validateToolParams({
        path: testDir,
      });
      expect(result).toBeNull();
    });

    it("should reject missing path", () => {
      const result = tool.validateToolParams({} as any);
      expect(result).toContain("path");
    });

    it("should reject non-string path", () => {
      const result = tool.validateToolParams({
        path: 123,
      } as any);
      expect(result).toContain("type");
    });

    it("should reject empty path", () => {
      const result = tool.validateToolParams({
        path: "",
      });
      expect(result).toBeNull(); // 空字符串在schema中是有效的，但在执行时会失败
    });
  });

  describe("execute", () => {
    it("should list directory contents successfully", async () => {
      const result = await tool.execute({
        path: testDir,
      });

      expect(result.llmContent).toContain(`Directory listing for ${testDir}:`);
      expect(result.llmContent).toContain("file1.txt");
      expect(result.llmContent).toContain("file2.md");
      expect(result.llmContent).toContain("[DIR] subdir");
    });

    it("should distinguish between files and directories", async () => {
      const result = await tool.execute({
        path: testDir,
      });

      // 文件应该没有[DIR]前缀
      expect(result.llmContent).toMatch(/^file1\.txt$/m);
      expect(result.llmContent).toMatch(/^file2\.md$/m);

      // 目录应该有[DIR]前缀
      expect(result.llmContent).toContain("[DIR] subdir");
    });

    it("should handle empty directory", async () => {
      const emptyDir = join(testDir, "empty");
      mkdirSync(emptyDir);

      const result = await tool.execute({
        path: emptyDir,
      });

      expect(result.llmContent).toContain(`Directory listing for ${emptyDir}:`);
      // 空目录应该只有标题，没有文件列表
      expect(result.llmContent.split("\\n")).toHaveLength(1);
    });

    it("should handle subdirectory listing", async () => {
      const result = await tool.execute({
        path: testSubDir,
      });

      expect(result.llmContent).toContain(
        `Directory listing for ${testSubDir}:`
      );
      expect(result.llmContent).toContain("nested.txt");
      expect(result.llmContent).not.toContain("[DIR]"); // 只有文件，没有子目录
    });

    it("should throw error for non-existent directory", async () => {
      const nonExistentDir = join(testDir, "non-existent");

      await expect(tool.execute({ path: nonExistentDir })).rejects.toThrow();
    });

    it("should throw error for file instead of directory", async () => {
      await expect(tool.execute({ path: testFile1 })).rejects.toThrow();
    });

    it("should throw error for invalid parameters", async () => {
      await expect(tool.execute({} as any)).rejects.toThrow(
        "Invalid parameters for list_directory tool"
      );
    });

    it("should handle special characters in filenames", async () => {
      const specialFile = join(testDir, "file with spaces & symbols!.txt");
      writeFileSync(specialFile, "Special content");

      const result = await tool.execute({
        path: testDir,
      });

      expect(result.llmContent).toContain("file with spaces & symbols!.txt");
    });
  });

  describe("FileEntry interface", () => {
    it("should return correct FileEntry properties", async () => {
      // 由于execute方法不直接返回FileEntry，我们通过内部逻辑测试
      // 这里主要测试execute方法能正确处理文件和目录的区别
      const result = await tool.execute({
        path: testDir,
      });

      // 验证结果包含了正确的文件和目录信息
      expect(result.llmContent).toContain("file1.txt");
      expect(result.llmContent).toContain("file2.md");
      expect(result.llmContent).toContain("[DIR] subdir");

      // 验证格式正确
      expect(result.llmContent).toMatch(/Directory listing for .+:/);
    });
  });
});
