import { readdirSync, statSync } from "fs";
import { join, basename } from "path";
import Ajv from "ajv";
import { Tool, ToolResult } from "./base-tool";

/**
 * Parameters for the GlobTool
 */
export interface GlobToolParams {
  /**
   * The glob pattern to match files against
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to current directory)
   */
  path?: string;
}

interface MatchedFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

export class GlobTool implements Tool<GlobToolParams, ToolResult> {
  name = "glob";
  description =
    "Efficiently finds files matching specific glob patterns (e.g., `src/**/*.ts`, `**/*.md`), returning absolute paths sorted by modification time (newest first). Ideal for quickly locating files based on their name or path structure, especially in large codebases.";

  schema = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description:
          "The glob pattern to match files against (e.g., '*.js', '**/*.ts', 'src/**/test*.js')",
      },
      path: {
        type: "string",
        description:
          "Optional: The absolute path to the directory to search within. If omitted, searches the root directory.",
      },
    },
    required: ["pattern"],
  };

  validateToolParams(params: GlobToolParams): string | null {
    const ajv = new Ajv();
    const validate = ajv.compile(this.schema);
    const valid = validate(params);

    if (!valid) {
      return (
        validate.errors
          ?.map((error) => {
            return `${error.keyword}: ${error.message}`;
          })
          .join(", ") || "Validation failed"
      );
    }

    if (!params.pattern || params.pattern.trim() === "") {
      return "Pattern cannot be empty";
    }

    return null;
  }

  async execute(params: GlobToolParams): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      throw new Error(`Invalid parameters for glob tool: ${validationError}`);
    }

    try {
      const searchPath = params.path || process.cwd();

      // Check if search path exists and is a directory
      const pathStat = statSync(searchPath);
      if (!pathStat.isDirectory()) {
        throw new Error(`Search path ${searchPath} is not a directory`);
      }

      const matches = this.findMatches(searchPath, params.pattern);

      if (matches.length === 0) {
        return {
          llmContent: `No files found matching pattern "${params.pattern}" in ${searchPath}`,
        };
      }

      const resultMessage = this.formatResults(
        matches,
        params.pattern,
        searchPath
      );
      return {
        llmContent: resultMessage,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to execute glob search: ${error.message}`);
      }
      throw new Error(`Failed to execute glob search: Unknown error`);
    }
  }

  private findMatches(searchPath: string, pattern: string): MatchedFile[] {
    const matches: MatchedFile[] = [];
    const isRecursive = pattern.includes("**");

    if (isRecursive) {
      this.searchRecursively(searchPath, pattern, searchPath, matches);
    } else {
      this.searchInDirectory(searchPath, pattern, matches);
    }

    return matches.sort((a, b) => a.path.localeCompare(b.path));
  }

  private searchRecursively(
    currentPath: string,
    pattern: string,
    basePath: string,
    matches: MatchedFile[]
  ): void {
    try {
      const entries = readdirSync(currentPath);

      for (const entry of entries) {
        // Skip common directories that should be ignored
        if (
          entry === "node_modules" ||
          entry === ".git" ||
          entry.startsWith(".")
        ) {
          continue;
        }

        const fullPath = join(currentPath, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Check if directory matches the pattern
          if (this.matchesPattern(fullPath, pattern, basePath)) {
            matches.push({
              name: entry,
              path: fullPath,
              isDirectory: true,
              size: 0,
              modifiedTime: stat.mtime,
            });
          }
          // Recursively search subdirectories
          this.searchRecursively(fullPath, pattern, basePath, matches);
        } else {
          // Check if file matches the pattern
          if (this.matchesPattern(fullPath, pattern, basePath)) {
            matches.push({
              name: entry,
              path: fullPath,
              isDirectory: false,
              size: stat.size,
              modifiedTime: stat.mtime,
            });
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read (permission issues, etc.)
      return;
    }
  }

  private searchInDirectory(
    searchPath: string,
    pattern: string,
    matches: MatchedFile[]
  ): void {
    try {
      const entries = readdirSync(searchPath);

      for (const entry of entries) {
        const fullPath = join(searchPath, entry);
        const stat = statSync(fullPath);

        if (this.matchesPattern(fullPath, pattern, searchPath)) {
          matches.push({
            name: entry,
            path: fullPath,
            isDirectory: stat.isDirectory(),
            size: stat.isDirectory() ? 0 : stat.size,
            modifiedTime: stat.mtime,
          });
        }
      }
    } catch (error) {
      throw new Error(`Cannot read directory ${searchPath}`);
    }
  }

  private matchesPattern(
    filePath: string,
    pattern: string,
    basePath: string
  ): boolean {
    const relativePath = filePath.replace(basePath, "").replace(/^\//, "");
    const fileName = basename(filePath);

    // Convert glob pattern to regex
    const regex = this.globToRegex(pattern);

    // Test against both relative path and filename
    return regex.test(relativePath) || regex.test(fileName);
  }

  private globToRegex(pattern: string): RegExp {
    // Escape special regex characters except glob wildcards
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "DOUBLESTAR")
      .replace(/\*/g, "[^/]*")
      .replace(/DOUBLESTAR/g, ".*")
      .replace(/\?/g, "[^/]");

    // Handle character ranges like [a-z]
    regexPattern = regexPattern.replace(/\\\[([^\]]*)\\\]/g, "[$1]");

    return new RegExp(`^${regexPattern}$`, "i");
  }

  private formatResults(
    matches: MatchedFile[],
    pattern: string,
    searchPath: string
  ): string {
    const fileCount = matches.filter((m) => !m.isDirectory).length;
    const dirCount = matches.filter((m) => m.isDirectory).length;

    let result = `Found ${matches.length} matches for pattern "${pattern}" in ${searchPath}:\n`;
    result += `(${fileCount} files, ${dirCount} directories)\n\n`;

    matches.forEach((match) => {
      const type = match.isDirectory ? "[DIR]" : "[FILE]";
      const size = match.isDirectory
        ? ""
        : ` (${this.formatFileSize(match.size)})`;
      const relativePath = match.path
        .replace(searchPath, "")
        .replace(/^\//, "");
      result += `${type} ${relativePath || match.name}${size}\n`;
    });

    return result;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }
}

export const globTool = new GlobTool();
