import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GlobTool, GlobToolParams } from "./glob";
import { readdirSync, statSync } from "fs";

// Mock fs module
vi.mock("fs", () => ({
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

const mockReaddirSync = vi.mocked(readdirSync);
const mockStatSync = vi.mocked(statSync);

describe("GlobTool", () => {
  let globTool: GlobTool;

  beforeEach(() => {
    vi.resetAllMocks();
    globTool = new GlobTool();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic properties", () => {
    it("should have correct name and description", () => {
      expect(globTool.name).toBe("glob");
      expect(globTool.description).toContain("finds files matching");
    });

    it("should have correct schema", () => {
      expect(globTool.schema.type).toBe("object");
      expect(globTool.schema.required).toEqual(["pattern"]);
      expect(globTool.schema.properties.pattern.type).toBe("string");
      expect(globTool.schema.properties.path?.type).toBe("string");
    });
  });

  describe("validateToolParams", () => {
    it("should return null for valid pattern", () => {
      const params: GlobToolParams = {
        pattern: "*.ts",
      };

      const result = globTool.validateToolParams(params);
      expect(result).toBeNull();
    });

    it("should return null for valid params with path", () => {
      const params: GlobToolParams = {
        pattern: "**/*.js",
        path: "/home/user/project",
      };

      const result = globTool.validateToolParams(params);
      expect(result).toBeNull();
    });

    it("should return error for missing pattern", () => {
      const params = {} as GlobToolParams;

      const result = globTool.validateToolParams(params);
      expect(result).toContain("required");
    });

    it("should return error for empty pattern", () => {
      const params: GlobToolParams = {
        pattern: "",
      };

      const result = globTool.validateToolParams(params);
      expect(result).toContain("Pattern cannot be empty");
    });

    it("should return error for whitespace-only pattern", () => {
      const params: GlobToolParams = {
        pattern: "   ",
      };

      const result = globTool.validateToolParams(params);
      expect(result).toContain("Pattern cannot be empty");
    });

    it("should return error for invalid parameter types", () => {
      const params = {
        pattern: 123,
      } as unknown as GlobToolParams;

      const result = globTool.validateToolParams(params);
      expect(result).toContain("type");
    });
  });

  describe("execute", () => {
    const mockDirStat = {
      isDirectory: vi.fn(() => true),
    };

    const mockFileStat = {
      isDirectory: vi.fn(() => false),
      size: 1024,
      mtime: new Date("2023-01-01"),
    };

    beforeEach(() => {
      mockStatSync.mockReturnValue(mockDirStat as any);
      mockReaddirSync.mockReturnValue([] as any);
    });

    it("should handle search with no matches", async () => {
      const params: GlobToolParams = {
        pattern: "*.nonexistent",
      };

      mockReaddirSync.mockReturnValue([] as any);

      const result = await globTool.execute(params);

      expect(result.llmContent).toContain("No files found matching pattern");
      expect(result.llmContent).toContain("*.nonexistent");
    });

    it("should find simple file matches", async () => {
      const params: GlobToolParams = {
        pattern: "*.ts",
        path: "/home/user/project",
      };

      mockReaddirSync.mockReturnValue([
        "file1.ts",
        "file2.js",
        "file3.ts",
      ] as any);
      mockStatSync
        .mockReturnValueOnce(mockDirStat as any) // for path check
        .mockReturnValue(mockFileStat as any); // for files

      const result = await globTool.execute(params);

      expect(result.llmContent).toContain("Found 2 matches");
      expect(result.llmContent).toContain("file1.ts");
      expect(result.llmContent).toContain("file3.ts");
      expect(result.llmContent).not.toContain("file2.js");
    });

    it("should handle recursive search with ** pattern", async () => {
      const params: GlobToolParams = {
        pattern: "**/*.test.ts",
        path: "/home/user/project",
      };

      // Mock directory structure
      mockReaddirSync
        .mockReturnValueOnce(["src", "dist", "package.json"] as any) // root level
        .mockReturnValueOnce(["components", "utils", "app.test.ts"] as any) // src level
        .mockReturnValueOnce(["Button.ts", "Button.test.ts"] as any) // components level
        .mockReturnValueOnce(["helper.ts", "helper.test.ts"] as any); // utils level

      const mockDirStatForSrc = { isDirectory: () => true };
      const mockDirStatForComponents = { isDirectory: () => true };
      const mockDirStatForUtils = { isDirectory: () => true };
      const mockFileStatForPackageJson = {
        isDirectory: () => false,
        size: 500,
        mtime: new Date(),
      };
      const mockFileStatForTestFiles = {
        isDirectory: () => false,
        size: 1024,
        mtime: new Date(),
      };
      const mockFileStatForRegularFiles = {
        isDirectory: () => false,
        size: 2048,
        mtime: new Date(),
      };

      mockStatSync
        .mockReturnValueOnce(mockDirStat as any) // for path check
        .mockReturnValueOnce(mockDirStatForSrc as any) // src
        .mockReturnValueOnce({
          isDirectory: () => false,
          size: 100,
          mtime: new Date(),
        } as any) // dist
        .mockReturnValueOnce(mockFileStatForPackageJson as any) // package.json
        .mockReturnValueOnce(mockDirStatForComponents as any) // components
        .mockReturnValueOnce(mockDirStatForUtils as any) // utils
        .mockReturnValueOnce(mockFileStatForTestFiles as any) // app.test.ts
        .mockReturnValueOnce(mockFileStatForRegularFiles as any) // Button.ts
        .mockReturnValueOnce(mockFileStatForTestFiles as any) // Button.test.ts
        .mockReturnValueOnce(mockFileStatForRegularFiles as any) // helper.ts
        .mockReturnValueOnce(mockFileStatForTestFiles as any); // helper.test.ts

      const result = await globTool.execute(params);

      expect(result.llmContent).toContain("Found 3 matches");
      expect(result.llmContent).toContain("app.test.ts");
      expect(result.llmContent).toContain("Button.test.ts");
      expect(result.llmContent).toContain("helper.test.ts");
    });

    it("should match directories when pattern includes them", async () => {
      const params: GlobToolParams = {
        pattern: "test*",
        path: "/home/user/project",
      };

      mockReaddirSync.mockReturnValue([
        "test-folder",
        "tests",
        "src",
        "test.js",
      ] as any);

      const mockTestDirStat = {
        isDirectory: () => true,
        size: 0,
        mtime: new Date(),
      };
      const mockTestsDirStat = {
        isDirectory: () => true,
        size: 0,
        mtime: new Date(),
      };
      const mockSrcDirStat = {
        isDirectory: () => true,
        size: 0,
        mtime: new Date(),
      };

      mockStatSync
        .mockReturnValueOnce(mockDirStat as any) // for path check
        .mockReturnValueOnce(mockTestDirStat as any) // test-folder
        .mockReturnValueOnce(mockTestsDirStat as any) // tests
        .mockReturnValueOnce(mockSrcDirStat as any) // src
        .mockReturnValueOnce(mockFileStat as any); // test.js

      const result = await globTool.execute(params);

      expect(result.llmContent).toContain("Found 3 matches");
      expect(result.llmContent).toContain("[DIR] test-folder");
      expect(result.llmContent).toContain("[DIR] tests");
      expect(result.llmContent).toContain("[FILE] test.js");
    });

    it("should handle wildcard patterns", async () => {
      const params: GlobToolParams = {
        pattern: "file?.ts",
      };

      mockReaddirSync.mockReturnValue([
        "file1.ts",
        "file2.ts",
        "file10.ts",
        "fileA.ts",
      ] as any);
      mockStatSync
        .mockReturnValueOnce(mockDirStat as any) // for path check
        .mockReturnValue(mockFileStat as any); // for files

      const result = await globTool.execute(params);

      expect(result.llmContent).toContain("Found 3 matches");
      expect(result.llmContent).toContain("file1.ts");
      expect(result.llmContent).toContain("file2.ts");
      expect(result.llmContent).toContain("fileA.ts");
      expect(result.llmContent).not.toContain("file10.ts"); // ? matches single character
    });

    it("should skip node_modules and .git directories", async () => {
      const params: GlobToolParams = {
        pattern: "**/*",
      };

      mockReaddirSync.mockReturnValue([
        "src",
        "node_modules",
        ".git",
        ".hidden",
      ] as any);

      const mockSrcDirStat = {
        isDirectory: () => true,
        size: 0,
        mtime: new Date(),
      };

      mockStatSync
        .mockReturnValueOnce(mockDirStat as any) // for path check
        .mockReturnValueOnce(mockSrcDirStat as any); // src only, others should be skipped

      const result = await globTool.execute(params);

      // Should only process src directory, not node_modules, .git, or .hidden
      expect(mockStatSync).toHaveBeenCalledTimes(2); // path check + src
    });

    it("should use current working directory as default", async () => {
      const params: GlobToolParams = {
        pattern: "*.ts",
      };

      const originalCwd = process.cwd();
      const spy = vi.spyOn(process, "cwd").mockReturnValue("/default/path");

      mockReaddirSync.mockReturnValue(["test.ts"] as any);

      await globTool.execute(params);

      expect(mockStatSync).toHaveBeenCalledWith("/default/path");

      spy.mockRestore();
    });

    it("should format file sizes correctly", async () => {
      const params: GlobToolParams = {
        pattern: "*",
      };

      mockReaddirSync.mockReturnValue([
        "small.txt",
        "medium.txt",
        "large.txt",
      ] as any);

      mockStatSync
        .mockReturnValueOnce(mockDirStat as any) // for path check
        .mockReturnValueOnce({
          isDirectory: () => false,
          size: 500,
          mtime: new Date(),
        } as any) // 500 B
        .mockReturnValueOnce({
          isDirectory: () => false,
          size: 1536,
          mtime: new Date(),
        } as any) // 1.5 KB
        .mockReturnValueOnce({
          isDirectory: () => false,
          size: 2097152,
          mtime: new Date(),
        } as any); // 2 MB

      const result = await globTool.execute(params);

      expect(result.llmContent).toContain("500 B");
      expect(result.llmContent).toContain("1.5 KB");
      expect(result.llmContent).toContain("2 MB");
    });

    it("should throw error for invalid parameters", async () => {
      const params: GlobToolParams = {
        pattern: "",
      };

      await expect(globTool.execute(params)).rejects.toThrow(
        "Invalid parameters for glob tool"
      );
    });

    it("should throw error when path is not a directory", async () => {
      const params: GlobToolParams = {
        pattern: "*.ts",
        path: "/home/user/file.txt",
      };

      mockDirStat.isDirectory.mockReturnValue(false);

      await expect(globTool.execute(params)).rejects.toThrow(
        "Failed to execute glob search"
      );
    });

    it("should throw error when path does not exist", async () => {
      const params: GlobToolParams = {
        pattern: "*.ts",
        path: "/nonexistent/path",
      };

      mockStatSync.mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      await expect(globTool.execute(params)).rejects.toThrow(
        "Failed to execute glob search"
      );
    });

    it("should handle permission errors gracefully during recursive search", async () => {
      const params: GlobToolParams = {
        pattern: "**/*.ts",
      };

      mockReaddirSync
        .mockReturnValueOnce(["accessible", "restricted"] as any) // root level
        .mockReturnValueOnce(["file.ts"] as any) // accessible folder
        .mockImplementationOnce(() => {
          throw new Error("Permission denied"); // restricted folder
        });

      const mockAccessibleDirStat = {
        isDirectory: () => true,
        size: 0,
        mtime: new Date(),
      };
      const mockRestrictedDirStat = {
        isDirectory: () => true,
        size: 0,
        mtime: new Date(),
      };

      mockStatSync
        .mockReturnValueOnce(mockDirStat as any) // for path check
        .mockReturnValueOnce(mockAccessibleDirStat as any) // accessible
        .mockReturnValueOnce(mockRestrictedDirStat as any) // restricted
        .mockReturnValueOnce(mockFileStat as any); // file.ts

      const result = await globTool.execute(params);

      expect(result.llmContent).toContain("Found 1 matches");
      expect(result.llmContent).toContain("file.ts");
    });

    it("should handle character ranges in patterns", async () => {
      const params: GlobToolParams = {
        pattern: "file[0-9].ts",
      };

      mockReaddirSync.mockReturnValue([
        "file1.ts",
        "file9.ts",
        "filea.ts",
        "fileA.ts",
      ] as any);
      mockStatSync
        .mockReturnValueOnce(mockDirStat as any) // for path check
        .mockReturnValue(mockFileStat as any); // for files

      const result = await globTool.execute(params);

      expect(result.llmContent).toContain("Found 2 matches");
      expect(result.llmContent).toContain("file1.ts");
      expect(result.llmContent).toContain("file9.ts");
      expect(result.llmContent).not.toContain("filea.ts");
      expect(result.llmContent).not.toContain("fileA.ts");
    });
  });
});
