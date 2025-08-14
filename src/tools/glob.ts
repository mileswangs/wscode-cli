import { statSync } from "fs";
import { basename, resolve } from "path";
import { glob } from "glob";
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
          "The glob pattern to match files against (e.g., '*.js', '**/*.ts', 'src/**/test*.js'). The value must be ONLY the glob pattern string, no extra instructions, no natural language text.",
      },
      path: {
        type: "string",
        description:
          "Optional: The absolute path to the directory to search within. If omitted, searches the root directory.",
      },
    },
    required: ["pattern"],
    additionalProperties: false,
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
      try {
        const pathStat = statSync(searchPath);
        if (!pathStat.isDirectory()) {
          throw new Error(`Search path ${searchPath} is not a directory`);
        }
      } catch (error) {
        throw new Error(
          `Search path ${searchPath} does not exist or is not accessible`
        );
      }

      // Use glob to find matching files
      const globOptions = {
        cwd: searchPath,
        absolute: true,
        ignore: ["node_modules/**", ".git/**", "**/.*"],
        dot: false,
        nodir: false, // Include directories in results
      };

      const matches = await glob(params.pattern, globOptions);

      if (matches.length === 0) {
        return {
          llmContent: `No files found matching pattern "${params.pattern}" in ${searchPath}`,
        };
      }

      // Get file stats for matched files
      const matchedFiles: MatchedFile[] = [];
      for (const match of matches) {
        try {
          const stat = statSync(match);
          matchedFiles.push({
            name: basename(match),
            path: match,
            isDirectory: stat.isDirectory(),
            size: stat.isDirectory() ? 0 : stat.size,
            modifiedTime: stat.mtime,
          });
        } catch (error) {
          // Skip files that can't be accessed
          continue;
        }
      }

      // Sort by path for consistent output
      matchedFiles.sort((a, b) => a.path.localeCompare(b.path));

      const resultMessage = this.formatResults(
        matchedFiles,
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
