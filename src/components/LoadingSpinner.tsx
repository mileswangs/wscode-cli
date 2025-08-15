import React, { useState, useEffect } from "react";
import { Text } from "ink";

interface LoadingSpinnerProps {
  text?: string;
}

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function LoadingSpinner({ text = "Loading..." }: LoadingSpinnerProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % spinnerFrames.length);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <Text color="yellow">
      {spinnerFrames[frame]} {text}
    </Text>
  );
}
