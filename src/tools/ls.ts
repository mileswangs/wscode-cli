import { readdirSync, statSync } from "fs";
import path, { join } from "path";
import Ajv from "ajv";
import { isWithinRoot, Tool, ToolResult, validateSchema } from "./base-tool";
interface LsParams {
  path: string;
}

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  modifiedTime: Date;
}

export class LsTool implements Tool<LsParams, ToolResult> {
  name = "list_directory";
  description =
    "Lists the names of files and subdirectories directly within a specified directory path. Can optionally ignore entries matching provided glob patterns.";

  schema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "The absolute path to the directory to list (must be absolute, not relative)",
      },
    },
    required: ["path"],
    additionalProperties: false,
  };

  private rootDirectory: string;

  constructor(rootDirectory: string) {
    this.rootDirectory = path.resolve(rootDirectory);
  }

  validateToolParams(params: LsParams): string | null {
    const validationError = validateSchema(this.schema, params);
    if (validationError) {
      return validationError;
    }

    if (!isWithinRoot(params.path, this.rootDirectory)) {
      return `Path must be within the root directory (${this.rootDirectory}): ${params.path}`;
    }

    return null;
  }

  async execute(params: LsParams): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      return {
        llmContent: validationError,
      };
    }

    const files = readdirSync(params.path);

    const entries = files.map((file): FileEntry => {
      const filePath = join(params.path, file);
      const fileStat = statSync(filePath);
      return {
        name: file,
        path: filePath,
        isDirectory: fileStat.isDirectory(),
        modifiedTime: fileStat.mtime,
      };
    });
    const directoryContent = entries
      .map((entry) => `${entry.isDirectory ? "[DIR] " : ""}${entry.name}`)
      .join("\n");

    let resultMessage = `Directory listing for ${params.path}:\n${directoryContent}`;
    return {
      llmContent: resultMessage,
    };
  }
}

export const lsTool = new LsTool(process.cwd());
