import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface InputPromptProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputPrompt({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type your message...",
}: InputPromptProps) {
  const [cursorVisible, setCursorVisible] = useState(true);

  // Toggle cursor visibility every 500ms
  React.useEffect(() => {
    if (disabled) {
      setCursorVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [disabled]);

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      onSubmit(value);
    } else if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
    } else if (!key.ctrl && !key.meta && input) {
      onChange(value + input);
    }
  });

  const displayText = value || placeholder;
  const isPlaceholder = !value && placeholder;

  return (
    <Box>
      <Text color="cyan" bold>
        {"> "}
      </Text>
      <Text color={isPlaceholder ? "gray" : "white"}>{displayText}</Text>
      {!disabled && cursorVisible && <Text color="cyan">▋</Text>}
    </Box>
  );
}
