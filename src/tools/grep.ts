import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative } from "path";
import { glob } from "glob";
import Ajv from "ajv";
import { Tool, ToolResult } from "./base-tool";

export interface GrepToolParams {
  /**
   * The regular expression pattern to search for in file contents
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to current directory relative to root)
   */
  path?: string;

  /**
   * File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
   */
  include?: string;
}

interface GrepMatch {
  file: string;
  lineNumber: number;
  line: string;
  matchedText: string;
}

export class GrepTool implements Tool<GrepToolParams, ToolResult> {
  name = "grep";
  description =
    "Searches for text patterns in files using regular expressions. Can search in a specific directory and filter by file patterns.";

  schema = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description:
          "The regular expression pattern to search for in file contents",
      },
      path: {
        type: "string",
        description:
          "The directory to search in (optional, defaults to current directory)",
      },
      include: {
        type: "string",
        description:
          "File pattern to include in the search (e.g. '*.js', '*.{ts,tsx}')",
      },
    },
    required: ["pattern"],
  };

  validateToolParams(params: GrepToolParams): string | null {
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

    // Validate pattern is a valid regex
    try {
      new RegExp(params.pattern);
    } catch (error) {
      return `Invalid regular expression pattern: ${params.pattern}`;
    }

    return null;
  }

  async execute(params: GrepToolParams): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      throw new Error(`Invalid parameters for grep tool: ${validationError}`);
    }

    try {
      const searchPath = params.path || process.cwd();
      const includePattern = params.include || "**/*";
      const regex = new RegExp(params.pattern, "gi");

      // Get list of files to search
      const files = await this.getFilesToSearch(searchPath, includePattern);
      const matches: GrepMatch[] = [];

      for (const file of files) {
        try {
          const fileMatches = await this.searchInFile(file, regex);
          matches.push(...fileMatches);
        } catch (error) {
          // Skip files that can't be read (binary files, permission issues, etc.)
          continue;
        }
      }

      return this.formatResults(
        matches,
        params.pattern,
        searchPath,
        files.length
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to execute grep search: ${error.message}`);
      }
      throw new Error(`Failed to execute grep search: Unknown error`);
    }
  }

  private async getFilesToSearch(
    searchPath: string,
    includePattern: string
  ): Promise<string[]> {
    try {
      // Check if search path exists and is a directory
      const pathStat = statSync(searchPath);
      if (!pathStat.isDirectory()) {
        throw new Error(`Search path ${searchPath} is not a directory`);
      }

      // Use glob to find matching files
      const globPattern = join(searchPath, includePattern);
      const files = await glob(globPattern, {
        nodir: true,
        ignore: [
          "node_modules/**",
          ".git/**",
          "**/*.{jpg,jpeg,png,gif,bmp,svg,ico,pdf,zip,tar,gz}",
        ],
      });

      return files;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get files to search: ${error.message}`);
      }
      throw error;
    }
  }

  private async searchInFile(
    filePath: string,
    regex: RegExp
  ): Promise<GrepMatch[]> {
    try {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const matches: GrepMatch[] = [];

      lines.forEach((line, index) => {
        const match = line.match(regex);
        if (match) {
          matches.push({
            file: filePath,
            lineNumber: index + 1,
            line: line.trim(),
            matchedText: match[0],
          });
        }
      });

      return matches;
    } catch (error) {
      // Re-throw to be caught by caller
      throw error;
    }
  }

  private formatResults(
    matches: GrepMatch[],
    pattern: string,
    searchPath: string,
    totalFiles: number
  ): ToolResult {
    if (matches.length === 0) {
      return {
        llmContent: `No matches found for pattern "${pattern}" in ${totalFiles} files searched in ${searchPath}`,
      };
    }

    const groupedByFile = matches.reduce((acc, match) => {
      const relativePath = relative(searchPath, match.file);
      if (!acc[relativePath]) {
        acc[relativePath] = [];
      }
      acc[relativePath].push(match);
      return acc;
    }, {} as Record<string, GrepMatch[]>);

    let result = `Found ${matches.length} matches for pattern "${pattern}" in ${
      Object.keys(groupedByFile).length
    } files (searched ${totalFiles} files in ${searchPath}):\n\n`;

    Object.entries(groupedByFile).forEach(([file, fileMatches]) => {
      result += `📁 ${file}:\n`;
      fileMatches.forEach((match) => {
        result += `  ${match.lineNumber}: ${match.line}\n`;
      });
      result += "\n";
    });

    return {
      llmContent: result,
    };
  }
}

export const grepTool = new GrepTool();
