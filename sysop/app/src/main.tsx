import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";
import "./styles.css";

import { MantineProvider } from "@mantine/core";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="light">
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
