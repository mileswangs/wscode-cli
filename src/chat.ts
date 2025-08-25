import OpenAI from "openai";
import { ToolRegistry, getBaseToolRegistry } from "./tools/tool-registry";
import { Tool, ToolResult } from "./tools/base-tool";
import { systemPrompt } from "./prompt";
import { config } from "dotenv";

// Load environment variables from .env file (only in development)
if (process.env.NODE_ENV !== "production") {
  config();
}

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

// Cached OpenAI client instance
let openaiClient: OpenAI | null = null;

// Get or create OpenAI client (singleton pattern)
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENROUTER_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_KEY environment variable is required");
    }

    openaiClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
    });
  }

  return openaiClient;
}

async function llmCall(
  messages: ChatMessage[],
  tools: OpenAI.Chat.Completions.ChatCompletionFunctionTool[]
) {
  const openai = getOpenAIClient();

  const resp = await openai.chat.completions.create({
    model: "anthropic/claude-sonnet-4",
    messages: messages,
    tools: tools,
  });

  const message = resp.choices?.[0].message;
  return message;
}

export class Chat {
  private history: ChatMessage[];
  private toolRegistry: ToolRegistry;

  constructor(rootDirectory?: string) {
    this.history = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];
    this.toolRegistry = getBaseToolRegistry(rootDirectory);
  }

  private async executeToolCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall
  ): Promise<ToolResult> {
    const tool = this.toolRegistry.getTool(toolCall.function.name);
    if (!tool) {
      throw new Error(`Tool ${toolCall.function.name} not found`);
    }

    let params;
    try {
      params = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      throw new Error(
        `Invalid JSON in tool arguments: ${toolCall.function.arguments}`
      );
    }

    const result = await tool.execute(params);
    return result;
  }

  async sendPrompt(prompt: string, userId?: string) {
    this.history.push({
      role: "user",
      content: prompt,
    });

    const tools = this.toolRegistry.getAllToolsSchema();
    let finalResponse: string | null = null;

    while (true) {
      const message = await llmCall(this.history, tools);

      if (!message) {
        throw new Error("No response from LLM");
      }

      this.history = this.history.concat(message);

      if (!message.tool_calls?.length) {
        finalResponse = message.content;
        break;
      }

      // Process tool calls
      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== "function") {
          continue;
        }

        const result = await this.executeToolCall(toolCall);

        this.history.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.llmContent,
        });
      }
    }

    return finalResponse;
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];
  }
}
