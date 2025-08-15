import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { Chat } from "../chat.js";
import { ChatInterface } from "./ChatInterface.tsx";
import { WelcomeScreen } from "./WelcomeScreen.tsx";

type AppState = "welcome" | "chat";

export function App() {
  const [state, setState] = useState<AppState>("welcome");
  const [chat] = useState(() => new Chat());
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
    }
  });

  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Box borderStyle="double" borderColor="blue" padding={1} marginBottom={1}>
        <Text bold color="blue">
          🤖 wsCode cli
        </Text>
      </Box>

      {state === "welcome" && (
        <WelcomeScreen onStart={() => setState("chat")} />
      )}

      {state === "chat" && (
        <ChatInterface chat={chat} onExit={() => setState("welcome")} />
      )}
    </Box>
  );
}
