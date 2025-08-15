import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { Chat } from "../chat.js";
import { MessageHistory } from "./MessageHistory.tsx";
import { InputPrompt } from "./InputPrompt.tsx";
import { LoadingSpinner } from "./LoadingSpinner.tsx";

interface ChatInterfaceProps {
  chat: Chat;
  onExit: () => void;
}

type ChatState = "idle" | "thinking" | "error";

export function ChatInterface({ chat, onExit }: ChatInterfaceProps) {
  const [state, setState] = useState<ChatState>("idle");
  const [currentInput, setCurrentInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: Date;
    }>
  >([]);

  const handleSubmit = async (input: string) => {
    if (!input.trim() || state !== "idle") return;

    const userMessage = {
      role: "user" as const,
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setState("thinking");
    setErrorMessage("");

    try {
      const content = await chat.sendPrompt(input.trim());

      if (content) {
        const assistantMessage = {
          role: "assistant" as const,
          content: content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMessage(errorMsg);
      setState("error");

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setErrorMessage("");
        setState("idle");
      }, 5000);
      return;
    }

    setState("idle");
  };

  useInput((input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Messages Area */}
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        <MessageHistory messages={messages} />
      </Box>

      {/* Status Area */}
      {state === "thinking" && (
        <Box borderStyle="single" borderColor="yellow" padding={1} marginY={1}>
          <LoadingSpinner text="AI is thinking..." />
        </Box>
      )}

      {state === "error" && errorMessage && (
        <Box borderStyle="single" borderColor="red" padding={1} marginY={1}>
          <Text color="red">Error: {errorMessage}</Text>
        </Box>
      )}

      {/* Input Area */}
      <Box borderStyle="single" borderColor="cyan" padding={1}>
        <InputPrompt
          value={currentInput}
          onChange={setCurrentInput}
          onSubmit={handleSubmit}
          disabled={state !== "idle"}
          placeholder="Ask me anything... (ESC to go back)"
        />
      </Box>

      {/* Help Text */}
      <Box justifyContent="space-between" marginTop={1}>
        <Text dimColor>
          Press <Text color="cyan">Enter</Text> to send •{" "}
          <Text color="yellow">ESC</Text> to go back
        </Text>
        <Text dimColor>
          <Text color="red">Ctrl+C</Text> to exit
        </Text>
      </Box>
    </Box>
  );
}
