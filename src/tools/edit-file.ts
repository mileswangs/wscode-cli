import { readFileSync, writeFileSync, statSync } from "fs";
import Ajv from "ajv";
import { Tool, ToolResult } from "./base-tool";

export interface EditToolParams {
  file_path: string;
  old_content: string;
  new_content: string;
}

export class EditFileTool implements Tool<EditToolParams, ToolResult> {
  name = "edit_file";
  description =
    "Edits the content of a file at the specified path. Requires the full original content and the full new content.";

  schema = {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description:
          "The absolute path to the file to modify. Must start with '/'.",
      },
      old_content: {
        type: "string",
        description:
          "The exact literal text to replace, preferably unescaped. For single replacements (default), include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely. For multiple replacements, specify expected_replacements parameter. If this string is not the exact literal text (i.e. you escaped it) or does not match exactly, the tool will fail.",
      },
      new_content: {
        type: "string",
        description:
          "The exact literal text to replace `old_string` with, preferably unescaped. Provide the EXACT text. Ensure the resulting code is correct and idiomatic.",
      },
    },
    required: ["file_path", "old_content", "new_content"],
  };

  validateToolParams(params: EditToolParams): string | null {
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

  async execute(params: EditToolParams): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      throw new Error(
        `Invalid parameters for edit_file tool: ${validationError}`
      );
    }

    try {
      // 检查文件是否存在
      const fileStat = statSync(params.file_path);
      if (!fileStat.isFile()) {
        throw new Error(`Path ${params.file_path} is not a file`);
      }

      // 读取当前文件内容
      const currentContent = readFileSync(params.file_path, "utf8");

      // 检查old_content是否存在于文件中
      if (!currentContent.includes(params.old_content)) {
        throw new Error(
          `Old content not found in file ${params.file_path}. Make sure the old_content exactly matches the text in the file including whitespace and indentation.`
        );
      }

      // 检查old_content是否只出现一次
      const occurrences = currentContent.split(params.old_content).length - 1;
      if (occurrences > 1) {
        throw new Error(
          `Old content appears ${occurrences} times in file ${params.file_path}. Please provide more specific context to uniquely identify the text to replace.`
        );
      }

      // 执行替换
      const newContent = currentContent.replace(
        params.old_content,
        params.new_content
      );

      // 写入文件
      writeFileSync(params.file_path, newContent, "utf8");

      // 获取更新后的文件信息
      const newFileStat = statSync(params.file_path);

      const resultMessage = `Successfully edited file: ${params.file_path}
File size: ${newFileStat.size} bytes
Last modified: ${newFileStat.mtime.toISOString()}

Changes made:
- Replaced ${params.old_content.length} characters with ${
        params.new_content.length
      } characters
- Net change: ${
        params.new_content.length - params.old_content.length > 0 ? "+" : ""
      }${params.new_content.length - params.old_content.length} characters

The file has been successfully updated.`;

      return {
        llmContent: resultMessage,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to edit file ${params.file_path}: ${error.message}`
        );
      }
      throw new Error(`Failed to edit file ${params.file_path}: Unknown error`);
    }
  }
}
