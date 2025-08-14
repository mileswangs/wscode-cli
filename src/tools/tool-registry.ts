import { OpenAI } from "openai/client";
import { Tool, ToolResult } from "./base-tool";
import { editFileTool } from "./edit-file";
import { grepTool } from "./grep";
import { lsTool } from "./ls";
import { readFileTool } from "./read-file";
import { globTool } from "./glob";

export class ToolRegistry {
  private tools: Map<string, Tool<any, ToolResult>>;

  constructor() {
    this.tools = new Map();
  }

  registerTool<TParams, TResult extends ToolResult>(
    tool: Tool<TParams, TResult>
  ): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name ${tool.name} is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  getTool<TParams, TResult extends ToolResult>(
    name: string
  ): Tool<TParams, TResult> | null {
    return (this.tools.get(name) as Tool<TParams, TResult>) || null;
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  getAllTools(): Tool<any, ToolResult>[] {
    return Array.from(this.tools.values());
  }

  getAllToolsSchema(): OpenAI.Chat.Completions.ChatCompletionFunctionTool[] {
    return this.getAllTools().map(
      (tool): OpenAI.Chat.Completions.ChatCompletionFunctionTool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.schema,
          strict: true,
        },
      })
    );
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }
}

export const getBaseToolRegistry = (): ToolRegistry => {
  const baseToolRegistry = new ToolRegistry();
  baseToolRegistry.registerTool(lsTool);
  baseToolRegistry.registerTool(grepTool);
  baseToolRegistry.registerTool(readFileTool);
  baseToolRegistry.registerTool(editFileTool);
  baseToolRegistry.registerTool(globTool);
  return baseToolRegistry;
};
