import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { EditFileTool } from "./edit-file";

describe("EditFileTool", () => {
  const tool = new EditFileTool();
  const testDir = join(process.cwd(), "test-temp-edit");
  const testFile = join(testDir, "test.txt");
  const testJsFile = join(testDir, "test.js");

  beforeEach(() => {
    // 创建测试目录
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // 清理测试文件
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("Tool Properties", () => {
    it("should have correct name and description", () => {
      expect(tool.name).toBe("edit_file");
      expect(tool.description).toContain("Edits the content of a file");
    });

    it("should have valid schema", () => {
      expect(tool.schema).toHaveProperty("type", "object");
      expect(tool.schema.properties).toHaveProperty("file_path");
      expect(tool.schema.properties).toHaveProperty("old_content");
      expect(tool.schema.properties).toHaveProperty("new_content");
      expect(tool.schema.required).toEqual([
        "file_path",
        "old_content",
        "new_content",
      ]);
    });
  });

  describe("validateToolParams", () => {
    it("should validate valid parameters", () => {
      const result = tool.validateToolParams({
        file_path: "/path/to/file.txt",
        old_content: "old text",
        new_content: "new text",
      });
      expect(result).toBeNull();
    });

    it("should return error for missing file_path", () => {
      const result = tool.validateToolParams({
        old_content: "old text",
        new_content: "new text",
      } as any);
      expect(result).toContain("file_path");
    });

    it("should return error for missing old_content", () => {
      const result = tool.validateToolParams({
        file_path: "/path/to/file.txt",
        new_content: "new text",
      } as any);
      expect(result).toContain("old_content");
    });

    it("should return error for missing new_content", () => {
      const result = tool.validateToolParams({
        file_path: "/path/to/file.txt",
        old_content: "old text",
      } as any);
      expect(result).toContain("new_content");
    });

    it("should return error for non-string file_path", () => {
      const result = tool.validateToolParams({
        file_path: 123,
        old_content: "old text",
        new_content: "new text",
      } as any);
      expect(result).toContain("file_path");
    });
  });

  describe("execute", () => {
    beforeEach(() => {
      // 创建测试文件
      writeFileSync(testFile, "Hello World\nThis is line 2\nThis is line 3");
      writeFileSync(
        testJsFile,
        `function hello() {
  console.log("Hello");
  return "world";
}

export default hello;`
      );
    });

    it("should successfully edit a file with simple text replacement", async () => {
      const result = await tool.execute({
        file_path: testFile,
        old_content: "Hello World",
        new_content: "Hello Universe",
      });

      expect(result.llmContent).toContain("Successfully edited file");
      expect(result.llmContent).toContain(testFile);

      const updatedContent = readFileSync(testFile, "utf8");
      expect(updatedContent).toBe(
        "Hello Universe\nThis is line 2\nThis is line 3"
      );
    });

    it("should successfully edit a file with multi-line replacement", async () => {
      const result = await tool.execute({
        file_path: testFile,
        old_content: "Hello World\nThis is line 2",
        new_content: "Greetings Earth\nThis is a new line",
      });

      expect(result.llmContent).toContain("Successfully edited file");

      const updatedContent = readFileSync(testFile, "utf8");
      expect(updatedContent).toBe(
        "Greetings Earth\nThis is a new line\nThis is line 3"
      );
    });

    it("should successfully edit a JavaScript file", async () => {
      const result = await tool.execute({
        file_path: testJsFile,
        old_content: `function hello() {
  console.log("Hello");
  return "world";
}`,
        new_content: `function hello() {
  console.log("Greetings");
  return "universe";
}`,
      });

      expect(result.llmContent).toContain("Successfully edited file");

      const updatedContent = readFileSync(testJsFile, "utf8");
      expect(updatedContent).toContain('console.log("Greetings")');
      expect(updatedContent).toContain('return "universe"');
    });

    it("should handle whitespace and indentation precisely", async () => {
      const jsContent = `function test() {
    const x = 1;
    const y = 2;
    return x + y;
}`;
      writeFileSync(testJsFile, jsContent);

      const result = await tool.execute({
        file_path: testJsFile,
        old_content: "    const x = 1;\n    const y = 2;",
        new_content: "    const x = 10;\n    const y = 20;",
      });

      expect(result.llmContent).toContain("Successfully edited file");

      const updatedContent = readFileSync(testJsFile, "utf8");
      expect(updatedContent).toContain("const x = 10;");
      expect(updatedContent).toContain("const y = 20;");
    });

    it("should include file statistics in result", async () => {
      const result = await tool.execute({
        file_path: testFile,
        old_content: "Hello World",
        new_content: "Hello Universe",
      });

      expect(result.llmContent).toContain("File size:");
      expect(result.llmContent).toContain("Last modified:");
      expect(result.llmContent).toContain("Changes made:");
      expect(result.llmContent).toContain("Net change:");
    });

    it("should show correct character count changes", async () => {
      const result = await tool.execute({
        file_path: testFile,
        old_content: "Hello World", // 11 characters
        new_content: "Hi", // 2 characters
      });

      expect(result.llmContent).toContain(
        "Replaced 11 characters with 2 characters"
      );
      expect(result.llmContent).toContain("Net change: -9 characters");
    });

    it("should throw error for non-existent file", async () => {
      await expect(
        tool.execute({
          file_path: join(testDir, "nonexistent.txt"),
          old_content: "old",
          new_content: "new",
        })
      ).rejects.toThrow("Failed to edit file");
    });

    it("should throw error when trying to edit a directory", async () => {
      await expect(
        tool.execute({
          file_path: testDir,
          old_content: "old",
          new_content: "new",
        })
      ).rejects.toThrow("is not a file");
    });

    it("should throw error when old_content is not found", async () => {
      await expect(
        tool.execute({
          file_path: testFile,
          old_content: "This text does not exist",
          new_content: "new text",
        })
      ).rejects.toThrow("Old content not found in file");
    });

    it("should throw error when old_content appears multiple times", async () => {
      writeFileSync(testFile, "test\ntest\nother content");

      await expect(
        tool.execute({
          file_path: testFile,
          old_content: "test",
          new_content: "replacement",
        })
      ).rejects.toThrow("Old content appears 2 times in file");
    });

    it("should handle empty old_content replacement", async () => {
      const result = await tool.execute({
        file_path: testFile,
        old_content: "",
        new_content: "NEW: ",
      });

      expect(result.llmContent).toContain("Successfully edited file");

      const updatedContent = readFileSync(testFile, "utf8");
      expect(updatedContent).toBe(
        "NEW: Hello World\nThis is line 2\nThis is line 3"
      );
    });

    it("should handle empty new_content replacement (deletion)", async () => {
      const result = await tool.execute({
        file_path: testFile,
        old_content: "Hello World\n",
        new_content: "",
      });

      expect(result.llmContent).toContain("Successfully edited file");

      const updatedContent = readFileSync(testFile, "utf8");
      expect(updatedContent).toBe("This is line 2\nThis is line 3");
    });

    it("should handle special characters in content", async () => {
      const specialContent =
        'const regex = /[a-z]+/g;\nconst str = "test$123@";';
      writeFileSync(testJsFile, specialContent);

      const result = await tool.execute({
        file_path: testJsFile,
        old_content: "/[a-z]+/g",
        new_content: "/[A-Z]+/g",
      });

      expect(result.llmContent).toContain("Successfully edited file");

      const updatedContent = readFileSync(testJsFile, "utf8");
      expect(updatedContent).toContain("/[A-Z]+/g");
    });

    it("should throw error for invalid parameters", async () => {
      await expect(
        tool.execute({
          file_path: "",
          old_content: "old",
          new_content: "new",
        })
      ).rejects.toThrow("Invalid parameters for edit_file tool");
    });

    it("should preserve file permissions after edit", async () => {
      const originalStat = statSync(testFile);

      await tool.execute({
        file_path: testFile,
        old_content: "Hello World",
        new_content: "Hello Universe",
      });

      const newStat = statSync(testFile);
      expect(newStat.mode).toBe(originalStat.mode);
    });

    it("should handle very large content replacement", async () => {
      const largeOldContent = "x".repeat(1000);
      const largeNewContent = "y".repeat(2000);

      writeFileSync(testFile, `prefix\n${largeOldContent}\nsuffix`);

      const result = await tool.execute({
        file_path: testFile,
        old_content: largeOldContent,
        new_content: largeNewContent,
      });

      expect(result.llmContent).toContain("Successfully edited file");
      expect(result.llmContent).toContain(
        "Replaced 1000 characters with 2000 characters"
      );
      expect(result.llmContent).toContain("Net change: +1000 characters");

      const updatedContent = readFileSync(testFile, "utf8");
      expect(updatedContent).toBe(`prefix\n${largeNewContent}\nsuffix`);
    });
  });
});
