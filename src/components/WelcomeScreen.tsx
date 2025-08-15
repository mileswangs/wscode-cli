import React from "react";
import { Box, Text, useInput } from "ink";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  useInput((input) => {
    if (input === "\r") {
      // Enter key
      onStart();
    }
  });

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      <Box marginBottom={2}>
        <Text bold color="cyan">
          Welcome to wsCode cli!
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          This assistant can help you with various tasks using powerful tools:
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={2} paddingLeft={2}>
        <Text color="green">
          • 📁 File operations (read, write, glob search)
        </Text>
        <Text color="green">• 🔍 Text search and grep</Text>
        <Text color="green">• 📂 Directory listing</Text>
        <Text color="green">• 🤖 AI-powered assistance</Text>
      </Box>

      <Box marginBottom={1}>
        <Text bold>
          Press <Text color="yellow">Enter</Text> to start chatting
        </Text>
      </Box>

      <Box>
        <Text dimColor>
          Press <Text color="red">Ctrl+C</Text> to exit at any time
        </Text>
      </Box>
    </Box>
  );
}
