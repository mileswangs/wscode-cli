import { readFileSync, statSync } from "fs";
import Ajv from "ajv";
import { Tool, ToolResult } from "./base-tool";

interface ReadFilesParams {
  paths: string[];
  encoding?: string;
}

export class ReadFilesTool implements Tool<ReadFilesParams, ToolResult> {
  name = "read_files";
  description =
    "Reads the content of multiple files at the specified paths and formats them for LLM consumption. Supports various text encodings.";

  schema = {
    type: "object",
    properties: {
      paths: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
      },
      encoding: {
        type: "string",
        enum: ["utf8", "ascii", "base64", "hex", "binary"],
        default: "utf8",
      },
    },
    required: ["paths"],
  };

  validateToolParams(params: ReadFilesParams): string | null {
    const ajv = new Ajv();
    const validate = ajv.compile(this.schema);
    const valid = validate(params);

    if (!valid) {
      return (
        validate.errors
          ?.map((error) => {
            const path = error.instancePath
              ? error.instancePath.substring(1)
              : error.keyword;
            return `${path}: ${error.message}`;
          })
          .join(", ") || "Validation failed"
      );
    }

    return null;
  }

  async execute(params: ReadFilesParams): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      throw new Error(
        `Invalid parameters for read_files tool: ${validationError}`
      );
    }

    const encoding = (params.encoding || "utf8") as BufferEncoding;
    const fileContents: string[] = [];
    const errors: string[] = [];

    for (const filePath of params.paths) {
      try {
        // 检查文件是否存在且是文件
        const fileStat = statSync(filePath);
        if (!fileStat.isFile()) {
          errors.push(`Path ${filePath} is not a file`);
          continue;
        }

        // 读取文件内容
        const content = readFileSync(filePath, encoding);

        // 格式化为LLM友好的格式
        const formattedContent = `
=== FILE: ${filePath} ===
Size: ${fileStat.size} bytes
Last Modified: ${fileStat.mtime.toISOString()}
Encoding: ${encoding}

${content}

=== END OF FILE: ${filePath} ===`;

        fileContents.push(formattedContent);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to read file ${filePath}: ${errorMessage}`);
      }
    }

    // 构建结果消息
    let resultMessage = `Read ${fileContents.length} files successfully`;
    if (errors.length > 0) {
      resultMessage += `, with ${errors.length} errors`;
    }
    resultMessage += `:\n\n`;

    // 添加所有成功读取的文件内容
    resultMessage += fileContents.join("\n\n");

    // 如果有错误，添加错误信息
    if (errors.length > 0) {
      resultMessage += `\n\n=== ERRORS ===\n${errors.join("\n")}`;
    }

    return {
      llmContent: resultMessage,
    };
  }
}
