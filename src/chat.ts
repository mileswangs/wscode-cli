import OpenAI from "openai";
import { ToolRegistry, getBaseToolRegistry } from "./tools/tool-registry";
import { Tool, ToolResult } from "./tools/base-tool";
import { systemPrompt } from "./prompt";
type ChatInput = OpenAI.Responses.ResponseInputItem;

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_KEY,
});

async function llmCall(input: ChatInput[], tools?: OpenAI.Responses.Tool[]) {
  return await openai.responses.create({
    model: "openai/gpt-4.1",
    input: input,
    tools: tools,
    tool_choice: tools && tools.length > 0 ? "auto" : undefined,
  });
}

export class Chat {
  private history: ChatInput[];
  private toolRegistry: ToolRegistry;

  constructor() {
    this.history = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];
    this.toolRegistry = getBaseToolRegistry();
  }

  private async executeToolCall(
    toolCall: OpenAI.Responses.ResponseFunctionToolCall
  ): Promise<ToolResult> {
    const tool = this.toolRegistry.getTool(toolCall.name);
    if (!tool) {
      throw new Error(`Tool ${toolCall.name} not found`);
    }

    let params;
    try {
      params = JSON.parse(toolCall.arguments);
    } catch (error) {
      throw new Error(`Invalid JSON in tool arguments: ${toolCall.arguments}`);
    }

    const validationError = tool.validateToolParams(params);
    if (validationError) {
      throw new Error(`Tool validation failed: ${validationError}`);
    }

    return await tool.execute(params);
  }

  async sendPrompt(prompt: string) {
    // 添加用户消息到历史
    this.history.push({
      role: "user",
      content: prompt,
    });
    const tools = this.toolRegistry.getAllToolsSchema();

    while (true) {
      const response = await llmCall(this.history, tools);
      const output = response.output;

      if (!output) {
        throw new Error("No response from LLM");
      }
      // 添加助手响应到历史
      this.history = this.history.concat(output);

      const toolCalls = output.filter((item) => item.type === "function_call");
      if (toolCalls.length === 0) {
        // 如果没有工具调用，直接返回响应
        console.log(this.history);
        return output;
      }
      for (const toolCall of toolCalls) {
        const result = await this.executeToolCall(toolCall);
        this.history.push({
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: result.toString(),
        });
      }
    }
  }

  getHistory(): ChatInput[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}
