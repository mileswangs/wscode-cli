import { config } from "dotenv";
import React from "react";
import { render } from "ink";
import { App } from "./components/App.tsx";

// Load environment variables from .env file (only in development)
if (process.env.NODE_ENV !== "production") {
  config();
}

render(React.createElement(App));
