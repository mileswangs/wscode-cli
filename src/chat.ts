import OpenAI from "openai";
import { ToolRegistry, getBaseToolRegistry } from "./tools/tool-registry";
import { Tool, ToolResult } from "./tools/base-tool";

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

async function llmCall(
  messages: ChatMessage[],
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[]
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return await openai.chat.completions.create({
    model: "gpt-4",
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: tools,
    tool_choice: tools && tools.length > 0 ? "auto" : undefined,
  });
}

export class Chat {
  private history: ChatMessage[];
  private toolRegistry: ToolRegistry;
  private openai: OpenAI;

  constructor() {
    this.history = [];
    this.toolRegistry = getBaseToolRegistry();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private convertToolsToOpenAIFormat(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return this.toolRegistry.getAllTools().map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema,
      },
    }));
  }

  private async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
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

  async sendPrompt(prompt: string): Promise<string> {
    // 添加用户消息到历史
    this.history.push({
      role: "user",
      content: prompt,
    });

    try {
      const tools = this.convertToolsToOpenAIFormat();

      // 调用LLM
      const response = await llmCall(this.history, tools);
      const message = response.choices[0]?.message;

      if (!message) {
        throw new Error("No response from LLM");
      }

      // 添加助手响应到历史
      this.history.push({
        role: "assistant",
        content: message.content || "",
        tool_calls: message.tool_calls,
      });

      // 处理工具调用
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolResults: string[] = [];

        for (const toolCall of message.tool_calls) {
          if (toolCall.type === "function") {
            try {
              const result = await this.executeToolCall({
                id: toolCall.id,
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              });

              // 添加工具结果到历史
              this.history.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: result.llmContent,
              });

              toolResults.push(result.llmContent);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              this.history.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: `Error executing tool ${toolCall.function.name}: ${errorMessage}`,
              });
            }
          }
        }

        // 如果有工具调用，再次调用LLM获取最终响应
        const finalResponse = await llmCall(this.history);
        const finalMessage = finalResponse.choices[0]?.message;

        if (finalMessage) {
          this.history.push({
            role: "assistant",
            content: finalMessage.content || "",
          });
          return finalMessage.content || "No response content";
        }
      }

      return message.content || "No response content";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Chat error:", errorMessage);

      // 添加错误响应到历史
      this.history.push({
        role: "assistant",
        content: `Sorry, I encountered an error: ${errorMessage}`,
      });

      return `Error: ${errorMessage}`;
    }
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  addSystemMessage(content: string): void {
    this.history.unshift({
      role: "system",
      content,
    });
  }

  getAvailableTools(): string[] {
    return this.toolRegistry.listTools();
  }
}
