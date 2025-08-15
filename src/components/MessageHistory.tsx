import React from "react";
import { Box, Text } from "ink";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MessageHistoryProps {
  messages: Message[];
}

export function MessageHistory({ messages }: MessageHistoryProps) {
  if (messages.length === 0) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
      >
        <Text dimColor>No messages yet. Start a conversation!</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {messages.map((message, index) => (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text bold color={message.role === "user" ? "blue" : "green"}>
              {message.role === "user" ? "👤 You:" : "🤖 Assistant:"}
            </Text>
            <Box marginLeft={1}>
              <Text dimColor>{message.timestamp.toLocaleTimeString()}</Text>
            </Box>
          </Box>

          <Box paddingLeft={2}>
            <Text wrap="wrap">{message.content}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
