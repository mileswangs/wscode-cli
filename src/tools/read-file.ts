import { readFileSync, statSync } from "fs";
import Ajv from "ajv";
import { Tool, ToolResult } from "./base-tool";
import path from "path";
export interface ReadFileParams {
  absolute_path: string;
  offset?: number;
  limit?: number;
}

export class ReadFileTool implements Tool<ReadFileParams, ToolResult> {
  name = "read_file";
  description =
    "Reads the content of a file at the specified absolute path. Supports optional offset and limit for partial reads.";

  schema = {
    type: "object",
    properties: {
      absolute_path: {
        type: "string",
        description:
          "The absolute path to the file to read (e.g., '/home/user/project/file.txt'). Relative paths are not supported. You must provide an absolute path.",
      },
      offset: {
        type: "integer",
        description:
          "Optional: For text files, the 0-based line number to start reading from. Requires 'limit' to be set. Use for paginating through large files.",
      },
      limit: {
        type: "integer",
        description:
          "Optional: For text files, maximum number of lines to read. Use with 'offset' to paginate through large files. If omitted, reads the entire file (if feasible, up to a default limit).",
      },
    },
    required: ["absolute_path"],
    additionalProperties: false,
  };

  validateToolParams(params: ReadFileParams): string | null {
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

    if (!path.isAbsolute(params.absolute_path)) {
      return `Absolute path must be absolute: ${params.absolute_path}`;
    }

    return null;
  }

  async execute(params: ReadFileParams): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      throw new Error(
        `Invalid parameters for read_file tool: ${validationError}`
      );
    }

    try {
      // Check if file exists and is a file
      const fileStat = statSync(params.absolute_path);
      if (!fileStat.isFile()) {
        throw new Error(`Path ${params.absolute_path} is not a file`);
      }

      // Read the file content
      const fileContent = readFileSync(params.absolute_path, "utf8");

      // Split content into lines for line-based offset and limit
      const lines = fileContent.split("\n");
      const totalLines = lines.length;

      // Apply offset and limit if specified (both are line-based)
      const offset = params.offset || 0;
      let selectedLines = lines;

      if (offset > 0) {
        selectedLines = selectedLines.slice(offset);
      }

      if (params.limit && params.limit > 0) {
        selectedLines = selectedLines.slice(0, params.limit);
      }

      const content = selectedLines.join("\n");
      const fileSize = fileStat.size;
      const actualBytesRead = Buffer.from(content, "utf8").length;
      const linesRead = selectedLines.length;

      const resultMessage = `Successfully read file: ${params.absolute_path}
File size: ${fileSize} bytes
Total lines: ${totalLines}
Lines read: ${linesRead}
Bytes read: ${actualBytesRead} bytes
${params.offset ? `Starting from line: ${params.offset}\n` : ""}${
        params.limit ? `Line limit: ${params.limit}\n` : ""
      }
Content:
${content}`;

      return {
        llmContent: resultMessage,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to read file ${params.absolute_path}: ${error.message}`
        );
      }
      throw new Error(
        `Failed to read file ${params.absolute_path}: Unknown error`
      );
    }
  }
}

export const readFileTool = new ReadFileTool();
