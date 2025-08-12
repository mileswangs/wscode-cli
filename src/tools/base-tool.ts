export interface Tool<TParams, TResult extends ToolResult = ToolResult> {
  name: string;
  description: string;
  schema: any;
  validateToolParams: (params: TParams) => string | null;
  execute: (params: TParams) => Promise<TResult>;
}

export interface ToolResult {
  llmContent: string;
}
