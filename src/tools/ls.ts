import { readdirSync, statSync } from "fs";
import { join } from "path";
import Ajv from "ajv";
import { Tool, ToolResult } from "./base-tool";

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
      path: { type: "string" },
    },
    required: ["path"],
  };

  validateToolParams(params: LsParams): string | null {
    const ajv = new Ajv();
    const validate = ajv.compile(this.schema);
    const valid = validate(params);
    console.log("Validation result:", valid);
    console.log("Validation errors:", validate.errors);

    if (!valid) {
      return (
        validate.errors
          ?.map((error) => {
            return `${error.keyword}: ${error.message}`;
          })
          .join(", ") || "Validation failed"
      );
    }

    return null;
  }

  async execute(params: LsParams): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      throw new Error(
        `Invalid parameters for list_directory tool: ${validationError}`
      );
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
