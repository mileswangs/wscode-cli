import { Chat } from "../src/chat";

/**
 * Example usage of the Chat class with optimized Langfuse monitoring
 *
 * Architecture:
 * - 1 Chat instance = 1 Session = 1 Trace
 * - Each sendPrompt call = 1 Span
 * - Each LLM call = 1 Generation
 * - Each tool execution = 1 Span
 */
async function exampleUsage() {
  // Create a chat instance with user tracking
  // This creates a session and a trace for the entire conversation
  const chat = new Chat(process.cwd(), "user-123");

  try {
    console.log("Starting chat session:", chat.getSessionId());

    // First prompt - creates a span under the main trace
    const response1 = await chat.sendPrompt(
      "List the files in the current directory"
    );

    console.log("Response 1:", response1);

    // Score the first interaction
    await chat.scoreLastConversation(4, "Good file listing");

    // Second prompt in the same session - creates another span
    const response2 = await chat.sendPrompt(
      "Can you tell me what the package.json file contains?"
    );

    console.log("Response 2:", response2);

    // Score the second interaction
    await chat.scoreLastConversation(5, "Perfect detailed response!");

    // Third prompt - demonstrate error handling
    try {
      const response3 = await chat.sendPrompt(
        "Read a file that doesn't exist: /nonexistent/file.txt"
      );
      console.log("Response 3:", response3);
    } catch (error) {
      console.error("Expected error:", error.message);
      // Even errors are tracked in Langfuse
    }

    console.log("Conversation history length:", chat.getHistory().length);

    // Start a new session (ends current trace and creates a new one)
    chat.clearHistory();
    console.log("New session started:", chat.getSessionId());

    const newSessionResponse = await chat.sendPrompt(
      "Hello, this is a new conversation!"
    );
    console.log("New session response:", newSessionResponse);

    // Properly end the session when done
    await chat.endSession();
    console.log("Session ended");
  } catch (error) {
    console.error("Chat error:", error);
    // Make sure to end the session even on error
    await chat.endSession();
  }
}

/**
 * Example of multiple concurrent chat sessions
 */
async function multipleSessions() {
  const user1Chat = new Chat(process.cwd(), "user-1");
  const user2Chat = new Chat(process.cwd(), "user-2");

  try {
    // These will create separate sessions and traces
    const [response1, response2] = await Promise.all([
      user1Chat.sendPrompt("What files are in the src directory?"),
      user2Chat.sendPrompt("Show me the project structure"),
    ]);

    console.log("User 1 response:", response1);
    console.log("User 2 response:", response2);

    // Score both conversations
    await Promise.all([
      user1Chat.scoreLastConversation(4, "User 1 satisfied"),
      user2Chat.scoreLastConversation(5, "User 2 very satisfied"),
    ]);
  } finally {
    // Clean up both sessions
    await Promise.all([user1Chat.endSession(), user2Chat.endSession()]);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  console.log("=== Single Session Example ===");
  exampleUsage()
    .then(() => {
      console.log("=== Multiple Sessions Example ===");
      return multipleSessions();
    })
    .then(() => {
      console.log("=== All examples completed ===");
    })
    .catch(console.error);
}

export { exampleUsage, multipleSessions };
