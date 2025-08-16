import OpenAI from "openai";
import { ToolRegistry, getBaseToolRegistry } from "./tools/tool-registry";
import { Tool, ToolResult } from "./tools/base-tool";
import { systemPrompt } from "./prompt";
import { config } from "dotenv";

import { Langfuse, LangfuseSpanClient, LangfuseTraceClient } from "langfuse";

// Load environment variables from .env file (only in development)
if (process.env.NODE_ENV !== "production") {
  config();
}

// Initialize Langfuse with environment variables
const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
});

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
  tools: OpenAI.Chat.Completions.ChatCompletionFunctionTool[],
  trace?: LangfuseTraceClient
) {
  const openai = getOpenAIClient();

  // Create generation span for LLM call tracking
  const generation = trace?.generation({
    name: "llm-call",
    model: "anthropic/claude-sonnet-4",
    input: messages,
    metadata: {
      toolsAvailable: tools.length,
    },
  });

  try {
    const resp = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4",
      messages: messages,
      tools: tools,
    });

    const message = resp.choices?.[0].message;

    // Track generation metrics
    generation?.end({
      output: message,
      usage: {
        input: resp.usage?.prompt_tokens,
        output: resp.usage?.completion_tokens,
        total: resp.usage?.total_tokens,
      },
    });

    return message;
  } catch (error) {
    generation?.end({
      level: "ERROR",
      statusMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export class Chat {
  private history: ChatMessage[];
  private toolRegistry: ToolRegistry;
  private sessionId: string;
  private currentTrace: LangfuseTraceClient | null = null;
  private userId?: string;

  constructor(rootDirectory?: string, userId?: string) {
    this.history = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];
    this.toolRegistry = getBaseToolRegistry(rootDirectory);
    this.sessionId = `session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.userId = userId;

    // 为整个会话创建一个 trace
    this.currentTrace = langfuse.trace({
      name: "chat-session",
      sessionId: this.sessionId,
      userId: this.userId,
      metadata: {
        startTime: new Date().toISOString(),
      },
    });
  }

  private async executeToolCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall,
    parentSpan?: LangfuseSpanClient
  ): Promise<ToolResult> {
    const tool = this.toolRegistry.getTool(toolCall.function.name);
    if (!tool) {
      throw new Error(`Tool ${toolCall.function.name} not found`);
    }

    // Create span for tool execution under the parent span
    const span = parentSpan?.span({
      name: `tool-${toolCall.function.name}`,
      input: {
        toolName: toolCall.function.name,
        arguments: toolCall.function.arguments,
      },
    });

    try {
      let params;
      try {
        params = JSON.parse(toolCall.function.arguments);
      } catch (error) {
        throw new Error(
          `Invalid JSON in tool arguments: ${toolCall.function.arguments}`
        );
      }

      const result = await tool.execute(params);

      span?.end({
        output: result,
        metadata: {
          toolId: toolCall.id,
          success: true,
        },
      });

      return result;
    } catch (error) {
      span?.end({
        level: "ERROR",
        statusMessage:
          error instanceof Error ? error.message : "Tool execution failed",
        output: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error;
    }
  }

  async sendPrompt(prompt: string, userId?: string) {
    if (!this.currentTrace) {
      throw new Error("No active trace found");
    }

    // 为每个用户消息创建一个 span，而不是新的 trace
    const promptSpan = this.currentTrace.span({
      name: "user-prompt",
      input: { userPrompt: prompt },
      metadata: {
        timestamp: new Date().toISOString(),
        userId: userId || this.userId,
      },
    });

    try {
      // 添加用户消息到历史
      this.history.push({
        role: "user",
        content: prompt,
      });

      const tools = this.toolRegistry.getAllToolsSchema();
      let toolCallCount = 0;
      let finalResponse: string | null = null;

      while (true) {
        const message = await llmCall(this.history, tools, this.currentTrace);

        if (!message) {
          throw new Error("No response from LLM");
        }

        // 添加助手响应到历史
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

          toolCallCount++;
          const result = await this.executeToolCall(toolCall, promptSpan);

          this.history.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result.llmContent,
          });
        }
      }

      // 结束当前 prompt span
      promptSpan.end({
        output: {
          response: finalResponse,
          toolCallsExecuted: toolCallCount,
        },
      });

      return finalResponse;
    } catch (error) {
      // 记录错误到 span
      promptSpan.end({
        level: "ERROR",
        statusMessage: error instanceof Error ? error.message : "Unknown error",
        output: {
          error: error instanceof Error ? error.message : "Unknown error",
          success: false,
        },
      });
      throw error;
    }
  }

  // Add method to score conversations
  async scoreLastConversation(score: number, comment?: string) {
    if (!this.currentTrace) {
      console.error("No active trace to score");
      return;
    }

    try {
      const scoreResult = langfuse.score({
        traceId: this.currentTrace.id,
        name: "user-satisfaction",
        value: score,
        comment: comment,
      });
      return scoreResult;
    } catch (error) {
      console.error("Failed to score conversation:", error);
    }
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory(): void {
    // 结束当前 trace
    if (this.currentTrace) {
      this.currentTrace.update({
        output: {
          conversationLength: this.history.length,
          endTime: new Date().toISOString(),
        },
      });
    }

    this.history = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // 生成新的 session ID 和 trace
    this.sessionId = `session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.currentTrace = langfuse.trace({
      name: "chat-session",
      sessionId: this.sessionId,
      userId: this.userId,
      metadata: {
        startTime: new Date().toISOString(),
      },
    });
  }

  // 添加清理方法
  async endSession() {
    if (this.currentTrace) {
      this.currentTrace.update({
        output: {
          conversationLength: this.history.length,
          endTime: new Date().toISOString(),
        },
      });
      this.currentTrace = null;
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
