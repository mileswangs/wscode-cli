import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReadFileTool, ReadFileParams } from "./read-file";
import { statSync, readFileSync } from "fs";

// Mock fs module
vi.mock("fs", () => ({
  statSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const mockStatSync = vi.mocked(statSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe("ReadFileTool", () => {
  let readFileTool: ReadFileTool;

  beforeEach(() => {
    vi.resetAllMocks();
    readFileTool = new ReadFileTool();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic properties", () => {
    it("should have correct name and description", () => {
      expect(readFileTool.name).toBe("read_file");
      expect(readFileTool.description).toContain("Reads the content of a file");
    });

    it("should have correct schema", () => {
      expect(readFileTool.schema.type).toBe("object");
      expect(readFileTool.schema.required).toEqual(["absolute_path"]);
      expect(readFileTool.schema.properties.absolute_path.type).toBe("string");
      expect(readFileTool.schema.properties.offset?.type).toBe("integer");
      expect(readFileTool.schema.properties.limit?.type).toBe("integer");
    });
  });

  describe("validateToolParams", () => {
    it("should return null for valid absolute path", () => {
      const params: ReadFileParams = {
        absolute_path: "/home/user/test.txt",
      };

      const result = readFileTool.validateToolParams(params);
      expect(result).toBeNull();
    });

    it("should return null for valid params with offset and limit", () => {
      const params: ReadFileParams = {
        absolute_path: "/home/user/test.txt",
        offset: 5,
        limit: 10,
      };

      const result = readFileTool.validateToolParams(params);
      expect(result).toBeNull();
    });

    it("should return error for relative path", () => {
      const params: ReadFileParams = {
        absolute_path: "relative/path/test.txt",
      };

      const result = readFileTool.validateToolParams(params);
      expect(result).toContain("Absolute path must be absolute");
    });

    it("should return error for missing required field", () => {
      const params = {} as ReadFileParams;

      const result = readFileTool.validateToolParams(params);
      expect(result).toContain("required");
    });

    it("should return error for invalid offset type", () => {
      const params = {
        absolute_path: "/home/user/test.txt",
        offset: "invalid",
      } as unknown as ReadFileParams;

      const result = readFileTool.validateToolParams(params);
      expect(result).toContain("type");
    });

    it("should return error for invalid limit type", () => {
      const params = {
        absolute_path: "/home/user/test.txt",
        limit: "invalid",
      } as unknown as ReadFileParams;

      const result = readFileTool.validateToolParams(params);
      expect(result).toContain("type");
    });
  });

  describe("execute", () => {
    const mockFileContent = "line 1\nline 2\nline 3\nline 4\nline 5";
    const mockFileStat = {
      isFile: vi.fn(() => true),
      size: 25,
    };

    beforeEach(() => {
      mockStatSync.mockReturnValue(mockFileStat as any);
      mockReadFileSync.mockReturnValue(mockFileContent);
    });

    it("should read entire file when no offset or limit specified", async () => {
      const params: ReadFileParams = {
        absolute_path: "/home/user/test.txt",
      };

      const result = await readFileTool.execute(params);

      expect(mockStatSync).toHaveBeenCalledWith("/home/user/test.txt");
      expect(mockReadFileSync).toHaveBeenCalledWith(
        "/home/user/test.txt",
        "utf8"
      );
      expect(result.llmContent).toContain("Successfully read file");
      expect(result.llmContent).toContain("Total lines: 5");
      expect(result.llmContent).toContain("Lines read: 5");
      expect(result.llmContent).toContain(mockFileContent);
    });

    it("should apply offset correctly", async () => {
      const params: ReadFileParams = {
        absolute_path: "/home/user/test.txt",
        offset: 2,
      };

      const result = await readFileTool.execute(params);

      expect(result.llmContent).toContain("Starting from line: 2");
      expect(result.llmContent).toContain("Lines read: 3");
      expect(result.llmContent).toContain("line 3\nline 4\nline 5");
    });

    it("should apply limit correctly", async () => {
      const params: ReadFileParams = {
        absolute_path: "/home/user/test.txt",
        limit: 3,
      };

      const result = await readFileTool.execute(params);

      expect(result.llmContent).toContain("Line limit: 3");
      expect(result.llmContent).toContain("Lines read: 3");
      expect(result.llmContent).toContain("line 1\nline 2\nline 3");
    });

    it("should apply both offset and limit correctly", async () => {
      const params: ReadFileParams = {
        absolute_path: "/home/user/test.txt",
        offset: 1,
        limit: 2,
      };

      const result = await readFileTool.execute(params);

      expect(result.llmContent).toContain("Starting from line: 1");
      expect(result.llmContent).toContain("Line limit: 2");
      expect(result.llmContent).toContain("Lines read: 2");
      expect(result.llmContent).toContain("line 2\nline 3");
    });

    it("should handle offset beyond file length", async () => {
      const params: ReadFileParams = {
        absolute_path: "/home/user/test.txt",
        offset: 10,
      };

      const result = await readFileTool.execute(params);

      expect(result.llmContent).toContain("Lines read: 0");
      expect(result.llmContent).toContain("Content:\n");
    });

    it("should handle limit larger than available lines", async () => {
      const params: ReadFileParams = {
        absolute_path: "/home/user/test.txt",
        limit: 10,
      };

      const result = await readFileTool.execute(params);

      expect(result.llmContent).toContain("Lines read: 5");
      expect(result.llmContent).toContain(mockFileContent);
    });

    it("should handle empty file", async () => {
      mockReadFileSync.mockReturnValue("");

      const params: ReadFileParams = {
        absolute_path: "/home/user/empty.txt",
      };

      const result = await readFileTool.execute(params);

      expect(result.llmContent).toContain("Total lines: 1");
      expect(result.llmContent).toContain("Lines read: 1");
    });

    it("should handle single line file", async () => {
      mockReadFileSync.mockReturnValue("single line");

      const params: ReadFileParams = {
        absolute_path: "/home/user/single.txt",
      };

      const result = await readFileTool.execute(params);

      expect(result.llmContent).toContain("Total lines: 1");
      expect(result.llmContent).toContain("Lines read: 1");
      expect(result.llmContent).toContain("single line");
    });

    it("should throw error for invalid parameters", async () => {
      const params: ReadFileParams = {
        absolute_path: "relative/path",
      };

      await expect(readFileTool.execute(params)).rejects.toThrow(
        "Invalid parameters for read_file tool"
      );
    });

    it("should throw error when path is not a file", async () => {
      mockFileStat.isFile.mockReturnValue(false);

      const params: ReadFileParams = {
        absolute_path: "/home/user/directory",
      };

      await expect(readFileTool.execute(params)).rejects.toThrow(
        "Path /home/user/directory is not a file"
      );
    });

    it("should throw error when file does not exist", async () => {
      mockStatSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      const params: ReadFileParams = {
        absolute_path: "/home/user/nonexistent.txt",
      };

      await expect(readFileTool.execute(params)).rejects.toThrow(
        "Failed to read file /home/user/nonexistent.txt"
      );
    });

    it("should throw error when file read fails", async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const params: ReadFileParams = {
        absolute_path: "/home/user/protected.txt",
      };

      await expect(readFileTool.execute(params)).rejects.toThrow(
        "Failed to read file /home/user/protected.txt"
      );
    });

    it("should handle unknown errors", async () => {
      mockStatSync.mockImplementation(() => {
        throw "Unknown error";
      });

      const params: ReadFileParams = {
        absolute_path: "/home/user/test.txt",
      };

      await expect(readFileTool.execute(params)).rejects.toThrow(
        "Failed to read file /home/user/test.txt: Unknown error"
      );
    });
  });
});
