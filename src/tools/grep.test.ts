import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GrepTool, GrepToolParams } from "./grep";
import { readdirSync, statSync, readFileSync } from "fs";
import { glob } from "glob";

// Mock fs module and glob
vi.mock("fs", () => ({
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("glob", () => ({
  glob: vi.fn(),
}));

const mockReaddirSync = vi.mocked(readdirSync);
const mockStatSync = vi.mocked(statSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockGlob = vi.mocked(glob);

describe("GrepTool", () => {
  let grepTool: GrepTool;

  beforeEach(() => {
    vi.resetAllMocks();
    grepTool = new GrepTool();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic properties", () => {
    it("should have correct name and description", () => {
      expect(grepTool.name).toBe("grep");
      expect(grepTool.description).toContain("Searches for text patterns");
    });

    it("should have correct schema", () => {
      expect(grepTool.schema.type).toBe("object");
      expect(grepTool.schema.required).toEqual(["pattern"]);
      expect(grepTool.schema.properties.pattern.type).toBe("string");
      expect(grepTool.schema.properties.path?.type).toBe("string");
      expect(grepTool.schema.properties.include?.type).toBe("string");
    });
  });

  describe("validateToolParams", () => {
    it("should return null for valid pattern", () => {
      const params: GrepToolParams = {
        pattern: "test",
      };

      const result = grepTool.validateToolParams(params);
      expect(result).toBeNull();
    });

    it("should return null for valid params with all options", () => {
      const params: GrepToolParams = {
        pattern: "test.*pattern",
        path: "/home/user/project",
        include: "*.ts",
      };

      const result = grepTool.validateToolParams(params);
      expect(result).toBeNull();
    });

    it("should return error for missing pattern", () => {
      const params = {} as GrepToolParams;

      const result = grepTool.validateToolParams(params);
      expect(result).toContain("required");
    });

    it("should return error for invalid regex pattern", () => {
      const params: GrepToolParams = {
        pattern: "[invalid regex",
      };

      const result = grepTool.validateToolParams(params);
      expect(result).toContain("Invalid regular expression pattern");
    });

    it("should return error for invalid parameter types", () => {
      const params = {
        pattern: 123,
      } as unknown as GrepToolParams;

      const result = grepTool.validateToolParams(params);
      expect(result).toContain("type");
    });
  });

  describe("execute", () => {
    const mockDirStat = {
      isDirectory: vi.fn(() => true),
    };

    beforeEach(() => {
      mockStatSync.mockReturnValue(mockDirStat as any);
      mockGlob.mockResolvedValue([]);
    });

    it("should handle search with no matches", async () => {
      const params: GrepToolParams = {
        pattern: "nonexistent",
      };

      mockGlob.mockResolvedValue([]);

      const result = await grepTool.execute(params);

      expect(result.llmContent).toContain("No matches found");
      expect(result.llmContent).toContain("nonexistent");
    });

    it("should find matches in files", async () => {
      const params: GrepToolParams = {
        pattern: "test",
        path: "/home/user/project",
      };

      const mockFiles = [
        "/home/user/project/file1.ts",
        "/home/user/project/file2.ts",
      ];
      const mockFileContent1 = "line 1\nthis is a test line\nline 3";
      const mockFileContent2 = "another test\nno match here\ntest again";

      mockGlob.mockResolvedValue(mockFiles);
      mockReadFileSync
        .mockReturnValueOnce(mockFileContent1)
        .mockReturnValueOnce(mockFileContent2);

      const result = await grepTool.execute(params);

      expect(mockGlob).toHaveBeenCalledWith("/home/user/project/**/*", {
        nodir: true,
        ignore: [
          "node_modules/**",
          ".git/**",
          "**/*.{jpg,jpeg,png,gif,bmp,svg,ico,pdf,zip,tar,gz}",
        ],
      });
      expect(mockReadFileSync).toHaveBeenCalledTimes(2);
      expect(result.llmContent).toContain("Found 3 matches");
      expect(result.llmContent).toContain("file1.ts");
      expect(result.llmContent).toContain("file2.ts");
      expect(result.llmContent).toContain("this is a test line");
      expect(result.llmContent).toContain("another test");
      expect(result.llmContent).toContain("test again");
    });

    it("should use custom include pattern", async () => {
      const params: GrepToolParams = {
        pattern: "function",
        path: "/home/user/project",
        include: "*.{ts,js}",
      };

      mockGlob.mockResolvedValue([]);

      await grepTool.execute(params);

      expect(mockGlob).toHaveBeenCalledWith("/home/user/project/*.{ts,js}", {
        nodir: true,
        ignore: [
          "node_modules/**",
          ".git/**",
          "**/*.{jpg,jpeg,png,gif,bmp,svg,ico,pdf,zip,tar,gz}",
        ],
      });
    });

    it("should handle regex patterns correctly", async () => {
      const params: GrepToolParams = {
        pattern: "test\\d+",
      };

      const mockFiles = ["/current/dir/file.ts"];
      const mockFileContent = "test1\ntest2\ntestABC\ntest123";

      mockGlob.mockResolvedValue(mockFiles);
      mockReadFileSync.mockReturnValue(mockFileContent);

      const result = await grepTool.execute(params);

      expect(result.llmContent).toContain("Found 3 matches");
      expect(result.llmContent).toContain("test1");
      expect(result.llmContent).toContain("test2");
      expect(result.llmContent).toContain("test123");
      expect(result.llmContent).not.toContain("testABC");
    });

    it("should skip unreadable files gracefully", async () => {
      const params: GrepToolParams = {
        pattern: "test",
      };

      const mockFiles = ["/current/dir/file1.ts", "/current/dir/file2.ts"];
      mockGlob.mockResolvedValue(mockFiles);
      mockReadFileSync
        .mockReturnValueOnce("readable file with test")
        .mockImplementationOnce(() => {
          throw new Error("Permission denied");
        });

      const result = await grepTool.execute(params);

      expect(result.llmContent).toContain("Found 1 matches");
      expect(result.llmContent).toContain("readable file with test");
    });

    it("should use current working directory as default path", async () => {
      const params: GrepToolParams = {
        pattern: "test",
      };

      const originalCwd = process.cwd();
      const spy = vi.spyOn(process, "cwd").mockReturnValue("/default/path");

      mockGlob.mockResolvedValue([]);

      await grepTool.execute(params);

      expect(mockStatSync).toHaveBeenCalledWith("/default/path");
      expect(mockGlob).toHaveBeenCalledWith(
        "/default/path/**/*",
        expect.any(Object)
      );

      spy.mockRestore();
    });

    it("should throw error for invalid parameters", async () => {
      const params: GrepToolParams = {
        pattern: "[invalid",
      };

      await expect(grepTool.execute(params)).rejects.toThrow(
        "Invalid parameters for grep tool"
      );
    });

    it("should throw error when search path is not a directory", async () => {
      const params: GrepToolParams = {
        pattern: "test",
        path: "/home/user/file.txt",
      };

      mockDirStat.isDirectory.mockReturnValue(false);

      await expect(grepTool.execute(params)).rejects.toThrow(
        "Failed to execute grep search"
      );
    });

    it("should throw error when path does not exist", async () => {
      const params: GrepToolParams = {
        pattern: "test",
        path: "/nonexistent/path",
      };

      mockStatSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      await expect(grepTool.execute(params)).rejects.toThrow(
        "Failed to execute grep search"
      );
    });

    it("should handle empty files", async () => {
      const params: GrepToolParams = {
        pattern: "test",
      };

      const mockFiles = ["/current/dir/empty.ts"];
      mockGlob.mockResolvedValue(mockFiles);
      mockReadFileSync.mockReturnValue("");

      const result = await grepTool.execute(params);

      expect(result.llmContent).toContain("No matches found");
    });

    it("should show line numbers correctly", async () => {
      const params: GrepToolParams = {
        pattern: "match",
      };

      const mockFiles = ["/current/dir/file.ts"];
      const mockFileContent =
        "line 1\nline 2 with match\nline 3\nline 4 with match";

      mockGlob.mockResolvedValue(mockFiles);
      mockReadFileSync.mockReturnValue(mockFileContent);

      const result = await grepTool.execute(params);

      expect(result.llmContent).toContain("2: line 2 with match");
      expect(result.llmContent).toContain("4: line 4 with match");
    });
  });
});
