import { Tool, ToolResult } from "./base-tool";
import { LsTool } from "./ls";
import { ReadFilesTool } from "./read-files";

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

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }
}

export const getBaseToolRegistry = (): ToolRegistry => {
  const baseToolRegistry = new ToolRegistry();
  baseToolRegistry.registerTool(new ReadFilesTool());
  baseToolRegistry.registerTool(new ReadFilesTool());
  baseToolRegistry.registerTool(new LsTool());
  return baseToolRegistry;
};
